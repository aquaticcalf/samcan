import type {
  editor,
  editor_key_input,
  editor_plugin,
  editor_pointer_input,
  editor_tool,
  editor_tool_id,
} from "@/editor/types"
import type { engine } from "@/engine/types"
import { render_engine_with_overlay } from "@/engine/render"
import {
  copy_selection_editor,
  cut_selection_editor,
  delete_selection_editor,
  duplicate_selection_editor,
  paste_clipboard_editor,
  redo_action_editor,
  undo_action_editor,
} from "@/editor/actions"
import { handle_global_key_editor, normalize_key_editor } from "@/editor/keys"
import { draw_editor_overlay } from "@/editor/overlay"
import { create_tool_registry_editor, install_plugin_editor, register_tool_editor, uninstall_plugin_editor } from "@/editor/registry"
import { current_tool_impl_editor, update_pointer_editor } from "@/editor/shared"
import { editor_tool_select } from "@/editor/types"

type editor_options = {
  initial_tool?: editor_tool_id
  plugins?: editor_plugin[]
}

export function create_editor(state: engine, options: editor_options = {}): editor {
  const editor_state: editor = {
    engine: state,
    current_tool: options.initial_tool ?? editor_tool_select,
    previous_tool_before_hand: null,
    selected_element_ids: new Set(),
    hovered_element_id: null,
    active_handle: null,
    pointer_capture: false,
    drag_state: null,
    marquee_state: null,
    clipboard_payload: null,
    active_transaction: null,
    undo_stack: [],
    redo_stack: [],
    transient_guides: [],
    pointer_world: [0, 0],
    pointer_screen: [0, 0],
    tools: create_tool_registry_editor(),
    plugin_tools: new Map(),
    id_counter: 0,
  }
  const plugins = options.plugins ?? []
  for (let i = 0; i < plugins.length; i = i + 1) {
    const plugin = plugins[i]
    if (plugin !== undefined) install_plugin_editor(editor_state, plugin)
  }
  return editor_state
}

export function render_editor(state: editor): void {
  render_engine_with_overlay(state.engine, (drawer) => {
    draw_editor_overlay(state, drawer)
    current_tool_impl_editor(state).overlay(state, drawer)
  })
}

export function set_tool_editor(state: editor, tool: editor_tool_id): void {
  if (!state.tools.has(tool) || state.current_tool === tool) return
  cancel_editor(state)
  state.current_tool = tool
}

export function register_editor_tool_editor(state: editor, tool: editor_tool): void {
  register_tool_editor(state, tool)
}

export function install_editor_plugin_editor(state: editor, plugin: editor_plugin): void {
  install_plugin_editor(state, plugin)
}

export function uninstall_editor_plugin_editor(state: editor, plugin_id: string): void {
  uninstall_plugin_editor(state, plugin_id)
}

export function cursor_editor(state: editor): string {
  return current_tool_impl_editor(state).cursor(state)
}

export function pointer_down_editor(state: editor, input: editor_pointer_input): void {
  update_pointer_editor(state, input)
  current_tool_impl_editor(state).pointer_down(state, input)
}

export function pointer_move_editor(state: editor, input: editor_pointer_input): void {
  update_pointer_editor(state, input)
  current_tool_impl_editor(state).pointer_move(state, input)
}

export function pointer_up_editor(state: editor, input: editor_pointer_input): void {
  update_pointer_editor(state, input)
  current_tool_impl_editor(state).pointer_up(state, input)
}

export function hover_editor(state: editor, input: editor_pointer_input): void {
  update_pointer_editor(state, input)
  current_tool_impl_editor(state).hover(state, input)
}

export function double_click_editor(state: editor, input: editor_pointer_input): void {
  update_pointer_editor(state, input)
  current_tool_impl_editor(state).double_click(state, input)
}

export function key_down_editor(state: editor, input: editor_key_input): void {
  if (!handle_global_key_editor(state, input)) current_tool_impl_editor(state).key_down(state, input)
}

export function key_up_editor(state: editor, input: editor_key_input): void {
  if (normalize_key_editor(input.key) === " " && state.previous_tool_before_hand !== null) {
    state.current_tool = state.previous_tool_before_hand
    state.previous_tool_before_hand = null
  }
}

export function cancel_editor(state: editor): void {
  current_tool_impl_editor(state).cancel(state)
}

export {
  copy_selection_editor,
  cut_selection_editor,
  delete_selection_editor,
  duplicate_selection_editor,
  paste_clipboard_editor,
  redo_action_editor,
  undo_action_editor,
}

