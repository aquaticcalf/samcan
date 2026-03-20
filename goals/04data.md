# Temporary Data Goals

## Objective

Define a stable scene, history, and persistence model for the current direction without turning `samcan` into a single-purpose codebase.

## Document Model

The current immutable `document` model is a good start. Keep that direction. The next major requirements are:

- explicit schema version
- serialization format
- deserialization validation
- migrations
- stable element ids
- stable layer ids

## History Model

Undo and redo should not be implemented as random document snapshots triggered from UI code. Use a clear transaction model with:

- transaction start
- transaction update
- transaction commit
- transaction cancel

History entries should represent user intent, not raw event noise.

## Persistence

The project needs:

- save format
- load format
- migration pipeline
- autosave
- crash recovery
- import and export boundaries

Early persistence can be local-only. The format should still be versioned from the start.

## Copy Semantics

Be careful with cloning behavior. Scene data should clone cleanly without aliasing mutable arrays or object references unexpectedly. This matters for:

- undo and redo
- copy and paste
- duplication
- collaboration diffing

## Asset References

Scene elements should not own all asset state directly. Prefer separating:

- element placement data
- asset identity
- asset load status
- decoded runtime cache

This is especially important for images.

## Recommended Future Additions

Likely future modules:

- `store/`
- `store/history/`
- `store/serialize/`
- `store/migrate/`

## Acceptance Criteria

The data layer is ready for long-term use when:

- documents can be serialized and loaded reliably
- schema versioning exists
- migrations are testable
- undo and redo are transaction-based
- asset references survive save and load correctly
