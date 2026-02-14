# Undo/Redo System

## Problem Statement

Users expect to undo mistakes. In a drawing app, this is critical - slip of the pen shouldn't be permanent.

Undo/redo seems simple (Ctrl+Z goes back) but has subtle complexity:

- What counts as an "undo step"? Every point in a stroke, or the whole stroke?
- How much history to keep? Infinite? Memory-limited?
- What about undo branches? (Undo, then do something new)
- What about collaborative editing? (Someone else's changes interleaved)

## Design Decisions

### Why command pattern?

Two approaches to undo:

**State snapshots**: Store entire document at each step

```
history = [doc_v1, doc_v2, doc_v3, ...]
undo = history[current - 1]
```

**Command pattern**: Store operations that were performed

```
history = [add_stroke_cmd, move_cmd, delete_cmd, ...]
undo = reverse_command(history[current])
```

We use command pattern because:

1. **Memory efficient** - Commands are tiny, snapshots are huge
2. **Semantic** - Commands describe what happened
3. **Merge-able** - Similar commands can be combined
4. **Reversible** - Each command knows how to undo itself

The cost is every operation needs an inverse. This is manageable.

### Why coarse granularity?

A single stroke involves hundreds of points. If each point is an undo step:

- Undo would take forever to go back
- History would be massive
- Not what users expect

We group operations into logical "transactions":

- Drawing a stroke = 1 undo step (not 500 points)
- Moving 10 selected elements = 1 undo step
- Typing a paragraph = 1 undo step (not per character)

The rule: **one user action = one undo step**.

### Why explicit transactions?

Operations are wrapped in transactions:

```typescript
begin_transaction(history, "Draw stroke")
dispatch(add_point(...))
dispatch(add_point(...))
dispatch(add_point(...))
commit_transaction(history)  // all points become one undo step
```

Instead of auto-grouping by time (dangerous, unpredictable) or by type (too complex).

Explicit transactions let the tool layer decide what constitutes a single action.

### Why limit history size?

Infinite undo sounds good but:

- Memory grows forever
- Really old history is rarely used
- Performance degrades with huge history

We limit to N undo steps (default 100). Oldest steps are discarded.

Alternative: limit by memory size (e.g., 50MB of history). Harder to implement, more predictable memory.

### Why discard redo on new action?

Standard undo behavior:

1. Do A, B, C
2. Undo → at B
3. Undo → at A
4. Do D → history is now [A, D], not [A, B, C, D]

The redo branch (B, C) is discarded when you do something new. This is expected behavior.

Alternative: "undo tree" preserving branches. More powerful, much more complex UI.

### Why not store reverse commands?

Option 1: Store command + reverse

```typescript
type history_entry = {
  command: command
  reverse: command // computed when command is applied
}
```

Option 2: Store only command, compute reverse on undo

```typescript
function undo(entry, doc) {
  return compute_reverse(entry.command, doc)
}
```

Option 1 is more reliable (reverse is computed with original state) but uses more memory.

We use option 1 - the reverse command is captured at apply time.

### Why support command merging?

Typing "hello" could be:

- 5 undo steps (one per character) - annoying
- 1 undo step (whole word) - convenient

Merging combines similar consecutive commands:

```typescript
if (can_merge(last_command, new_command)) {
  merge_commands(last_command, new_command)
} else {
  add_to_history(new_command)
}
```

Merging rules:

- Same command type
- Same target element
- Within time threshold (e.g., 500ms)
- Not across explicit boundaries (user hit enter, clicked elsewhere)

## Command Types

```typescript
type command =
  | { type: "add_element"; element: element }
  | { type: "remove_element"; element: element }
  | { type: "update_element"; id: string; before: element; after: element }
  | { type: "batch"; commands: command[] }
```

Each command type has a reverse:

- `add_element` → `remove_element`
- `remove_element` → `add_element`
- `update_element` → `update_element` with before/after swapped
- `batch` → `batch` with reversed commands in reverse order

## History Structure

```typescript
type history_entry = {
  id: string
  label: string // "Draw stroke", "Delete 3 elements"
  command: command
  reverse: command
  timestamp: number
}

type history_state = {
  entries: history_entry[]
  current_index: number // points after last applied entry
  max_entries: number
  transaction: transaction | null
}

type transaction = {
  label: string
  commands: command[]
  start_time: number
}
```

`current_index` is like a cursor:

- 0 = nothing applied (initial state)
- entries.length = all applied (current state)
- Between = some undone

## Operations

```typescript
// Transaction management
function begin_transaction(history: history_state, label: string): history_state
function commit_transaction(history: history_state): history_state
function rollback_transaction(history: history_state): history_state

// History manipulation
function push_command(history: history_state, command: command, reverse: command): history_state
function undo_history(history: history_state): { history: history_state; reverse: command } | null
function redo_history(history: history_state): { history: history_state; command: command } | null

// Queries
function can_undo(history: history_state): boolean
function can_redo(history: history_state): boolean
function get_undo_label(history: history_state): string | null
function get_redo_label(history: history_state): string | null
```

## Integration with Document

The undo system and document are separate. Integration:

```typescript
// Apply a document change
function apply_document_change(doc, history, command) {
  // Apply command to document
  const new_doc = apply_command(doc, command)

  // Compute reverse command
  const reverse = compute_reverse(command, doc)

  // Add to history
  const new_history = push_command(history, command, reverse)

  return { doc: new_doc, history: new_history }
}

// Undo
function undo_document(doc, history) {
  const result = undo_history(history)
  if (!result) return { doc, history }

  const new_doc = apply_command(doc, result.reverse)
  return { doc: new_doc, history: result.history }
}
```

This keeps document and history decoupled - document doesn't know about undo.

## Usage Pattern

```typescript
// Setup
let doc = create_document()
let history = create_history_state(100)  // 100 undo steps

// During interaction (e.g., drawing)
function onStrokeStart() {
  history = begin_transaction(history, "Draw stroke")
}

function onStrokePoint(point) {
  // Apply change
  const cmd = { type: "update_element", ... }
  const result = apply_document_change(doc, history, cmd)
  doc = result.doc
  history = result.history
}

function onStrokeEnd() {
  history = commit_transaction(history)
}

// User hits Ctrl+Z
function onUndo() {
  const result = undo_document(doc, history)
  doc = result.doc
  history = result.history
  render()
}
```

## File Structure

```
history/
  types.ts         # command, history_entry, history_state, transaction
  commands.ts      # Command creation and reversal
  history.ts       # History state management
  transaction.ts   # Transaction handling
  merge.ts         # Command merging logic
```

## Dependencies

From document module:

- `element` types for command payloads
- `document` operations for command application

No math dependencies - history is pure data structure manipulation.

## Performance Considerations

### Memory

Each history entry stores:

- The command (element data for add/remove)
- The reverse command (same size)

A stroke with 1000 points: ~40KB per entry × 2 = ~80KB

100 entries = ~8MB worst case (if all are large strokes)

Most entries are smaller (moves, deletes store just IDs).

### Serialization

History can be serialized for crash recovery:

```typescript
function serialize_history(history): string
function deserialize_history(json): history_state
```

But we don't persist history by default - it's session-only.

### Large Batches

Deleting 1000 elements = storing 1000 elements in reverse command.

Options:

1. Accept the memory hit (simple)
2. Store element IDs + reference to "deleted elements" pool
3. Compress element data

We do option 1 for now. Optimize if memory becomes an issue.

## Open Questions

1. **Collaborative undo** - If multiple users are editing, whose history is whose? Operational Transform or CRDT needed.

2. **Selective undo** - Can user undo just one specific action, not the most recent? This is a different UX paradigm.

3. **Undo for view changes** - Should camera pan/zoom be undoable? Usually not, but some users expect it.

4. **Crash recovery** - Auto-save history to IndexedDB for recovery? Adds complexity but prevents data loss.

## Success Criteria

The undo/redo system is done when:

1. Ctrl+Z / Ctrl+Y work as expected
2. Undo steps match user intent (one stroke = one step)
3. Memory usage is bounded (oldest entries dropped)
4. No bugs from transaction edge cases
5. Redo branch behaves correctly after new actions
