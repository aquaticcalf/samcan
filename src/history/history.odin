package history

import doc "../document"

state :: struct {
    undo: [dynamic]doc.document,
    redo: [dynamic]doc.document,
}

new :: proc() -> state {
    return state{
        undo = make([dynamic]doc.document, 0),
        redo = make([dynamic]doc.document, 0),
    }
}

destroy :: proc(history: ^state) {
    reset(history)
    delete(history.undo)
    delete(history.redo)
    history^ = {}
}

reset :: proc(history: ^state) {
    clear_stack(&history.undo)
    clear_stack(&history.redo)
}

record :: proc(history: ^state, before, after: ^doc.document) {
    if doc.same(before, after) {
        return
    }
    append(&history.undo, doc.clone(before))
    clear_stack(&history.redo)
}

undo :: proc(history: ^state, current: ^doc.document) -> bool {
    if len(history.undo) == 0 {
        return false
    }

    append(&history.redo, doc.clone(current))
    previous := history.undo[len(history.undo) - 1]
    resize(&history.undo, len(history.undo) - 1)
    doc.destroy(current)
    current^ = previous
    return true
}

redo :: proc(history: ^state, current: ^doc.document) -> bool {
    if len(history.redo) == 0 {
        return false
    }

    append(&history.undo, doc.clone(current))
    next := history.redo[len(history.redo) - 1]
    resize(&history.redo, len(history.redo) - 1)
    doc.destroy(current)
    current^ = next
    return true
}

clear_stack :: proc(stack: ^[dynamic]doc.document) {
    for &snapshot in stack {
        doc.destroy(&snapshot)
    }
    clear(stack)
}
