import { describe, expect, it } from "bun:test"
import {
    AddNodeCommand,
    DeleteNodeCommand,
    ModifyPropertyCommand,
    AddKeyframeCommand,
} from "../core/command/editorcommands"
import { CommandHistory } from "../core/command/commandhistory"
import { SceneNode } from "../core/scene/node"
import { GroupNode } from "../core/scene/nodes/groupnode"
import { AnimationTrack } from "../core/animation/animationtrack"

describe("AddNodeCommand", () => {
    it("should add a node to parent", () => {
        const parent = new GroupNode()
        const child = new SceneNode()
        const command = new AddNodeCommand()

        command.execute([{ parent, node: child }])

        expect(parent.children).toContain(child)
        expect(child.parent).toBe(parent)
    })

    it("should undo node addition", () => {
        const parent = new GroupNode()
        const child = new SceneNode()
        const command = new AddNodeCommand()

        command.execute([{ parent, node: child }])
        command.undo()

        expect(parent.children).not.toContain(child)
        expect(child.parent).toBeNull()
    })

    it("should validate arguments", () => {
        const command = new AddNodeCommand()
        const parent = new GroupNode()
        const child = new SceneNode()

        const result = command.validate([{ parent, node: child }])
        expect(result.valid).toBe(true)
    })

    it("should reject adding node as child of itself", () => {
        const command = new AddNodeCommand()
        const node = new GroupNode()

        const result = command.validate([{ parent: node, node }])
        expect(result.valid).toBe(false)
        expect(result.errors).toContain(
            "Cannot add a node as a child of itself",
        )
    })
})

describe("DeleteNodeCommand", () => {
    it("should delete a node from parent", () => {
        const parent = new GroupNode()
        const child = new SceneNode()
        parent.addChild(child)

        const command = new DeleteNodeCommand()
        command.execute([{ node: child }])

        expect(parent.children).not.toContain(child)
        expect(child.parent).toBeNull()
    })

    it("should undo node deletion", () => {
        const parent = new GroupNode()
        const child = new SceneNode()
        parent.addChild(child)

        const command = new DeleteNodeCommand()
        command.execute([{ node: child }])
        command.undo()

        expect(parent.children).toContain(child)
        expect(child.parent).toBe(parent)
    })

    it("should validate node has parent", () => {
        const command = new DeleteNodeCommand()
        const orphan = new SceneNode()

        const result = command.validate([{ node: orphan }])
        expect(result.valid).toBe(false)
        expect(result.errors).toContain(
            "Cannot delete node: node has no parent",
        )
    })
})

describe("ModifyPropertyCommand", () => {
    it("should modify node property", () => {
        const node = new SceneNode()
        const command = new ModifyPropertyCommand()

        command.execute([{ target: node, property: "opacity", newValue: 0.5 }])

        expect(node.opacity).toBe(0.5)
    })

    it("should undo property modification", () => {
        const node = new SceneNode()
        node.opacity = 1.0

        const command = new ModifyPropertyCommand()
        command.execute([{ target: node, property: "opacity", newValue: 0.5 }])
        command.undo()

        expect(node.opacity).toBe(1.0)
    })

    it("should validate property exists", () => {
        const command = new ModifyPropertyCommand()
        const node = new SceneNode()

        const result = command.validate([
            { target: node, property: "opacity", newValue: 0.5 },
        ])
        expect(result.valid).toBe(true)
    })
})

describe("AddKeyframeCommand", () => {
    it("should add keyframe to track", () => {
        const node = new SceneNode()
        const track = new AnimationTrack(node, "opacity")
        const command = new AddKeyframeCommand()

        command.execute([{ track, time: 1.0, value: 0.5 }])

        expect(track.keyframes.length).toBe(1)
        expect(track.keyframes[0]?.time).toBe(1.0)
        expect(track.keyframes[0]?.value).toBe(0.5)
    })

    it("should undo keyframe addition", () => {
        const node = new SceneNode()
        const track = new AnimationTrack(node, "opacity")
        const command = new AddKeyframeCommand()

        command.execute([{ track, time: 1.0, value: 0.5 }])
        command.undo()

        expect(track.keyframes.length).toBe(0)
    })

    it("should validate keyframe time is non-negative", () => {
        const command = new AddKeyframeCommand()
        const node = new SceneNode()
        const track = new AnimationTrack(node, "opacity")

        const result = command.validate([{ track, time: -1, value: 0.5 }])
        expect(result.valid).toBe(false)
        expect(result.errors).toContain("Keyframe time must be non-negative")
    })
})

describe("CommandHistory integration", () => {
    it("should execute and undo commands through history", () => {
        const history = new CommandHistory()
        const parent = new GroupNode()
        const child = new SceneNode()
        const command = new AddNodeCommand()

        history.execute(command, [{ parent, node: child }])
        expect(parent.children).toContain(child)

        history.undo()
        expect(parent.children).not.toContain(child)
    })

    it("should execute and redo commands through history", () => {
        const history = new CommandHistory()
        const parent = new GroupNode()
        const child = new SceneNode()
        const command = new AddNodeCommand()

        history.execute(command, [{ parent, node: child }])
        history.undo()
        history.redo()

        expect(parent.children).toContain(child)
    })

    it("should handle multiple commands", () => {
        const history = new CommandHistory()
        const parent = new GroupNode()
        const child1 = new SceneNode()
        const child2 = new SceneNode()

        history.execute(new AddNodeCommand(), [{ parent, node: child1 }])
        history.execute(new AddNodeCommand(), [{ parent, node: child2 }])

        expect(parent.children.length).toBe(2)

        history.undo()
        expect(parent.children.length).toBe(1)
        expect(parent.children).toContain(child1)

        history.undo()
        expect(parent.children.length).toBe(0)
    })
})
