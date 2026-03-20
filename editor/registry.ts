import type { editor, editor_plugin, editor_tool, editor_tool_id } from "@/editor/types"
import { editor_tool_arrow, editor_tool_ellipse, editor_tool_line, editor_tool_rectangle } from "@/editor/types"
import { create_draw_tool_editor } from "@/editor/tools/draw"
import { create_hand_tool_editor } from "@/editor/tools/hand"
import { create_image_tool_editor } from "@/editor/tools/image"
import { create_select_tool_editor } from "@/editor/tools/select"
import { create_shape_tool_editor } from "@/editor/tools/shape"
import { create_text_tool_editor } from "@/editor/tools/text"

export function create_tool_registry_editor(): Map<editor_tool_id, editor_tool> {
  const tools = new Map<editor_tool_id, editor_tool>()
  register_tool_in_map_editor(tools, create_select_tool_editor())
  register_tool_in_map_editor(tools, create_hand_tool_editor())
  register_tool_in_map_editor(tools, create_draw_tool_editor())
  register_tool_in_map_editor(tools, create_shape_tool_editor(editor_tool_rectangle))
  register_tool_in_map_editor(tools, create_shape_tool_editor(editor_tool_ellipse))
  register_tool_in_map_editor(tools, create_shape_tool_editor(editor_tool_line))
  register_tool_in_map_editor(tools, create_shape_tool_editor(editor_tool_arrow))
  register_tool_in_map_editor(tools, create_text_tool_editor())
  register_tool_in_map_editor(tools, create_image_tool_editor())
  return tools
}

export function register_tool_editor(state: editor, tool: editor_tool): void {
  register_tool_in_map_editor(state.tools, tool)
}

export function install_plugin_editor(state: editor, plugin: editor_plugin): void {
  const ids: editor_tool_id[] = []
  for (let i = 0; i < plugin.tools.length; i = i + 1) {
    const tool = plugin.tools[i]
    if (tool === undefined) continue
    register_tool_in_map_editor(state.tools, tool)
    ids.push(tool.id)
  }
  state.plugin_tools.set(plugin.id, ids)
}

export function uninstall_plugin_editor(state: editor, plugin_id: string): void {
  const ids = state.plugin_tools.get(plugin_id)
  if (ids === undefined) return
  for (let i = 0; i < ids.length; i = i + 1) {
    const id = ids[i]
    if (id !== undefined) state.tools.delete(id)
  }
  state.plugin_tools.delete(plugin_id)
}

function register_tool_in_map_editor(
  tools: Map<editor_tool_id, editor_tool>,
  tool: editor_tool,
): void {
  tools.set(tool.id, tool)
}

