import type { SceneNode } from "../scene/node"
import type { AnimationTrack } from "../animation/animationtrack"
import { Keyframe } from "../animation/keyframe"
import type { InterpolationType, EasingFunction } from "../animation/keyframe"
import { BaseCommand } from "./basecommand"
import type { CommandValidationResult } from "./command"

/**
 * Arguments for AddNodeCommand
 */
interface AddNodeArgs {
    parent: SceneNode
    node: SceneNode
    index?: number
}

/**
 * Command to add a node to the scene graph
 * Supports undo by removing the node
 */
class AddNodeCommand extends BaseCommand<AddNodeArgs> {
    name = "AddNode"
    description = "Add a node to the scene graph"
    category = "scene" as const

    private parent: SceneNode | null = null
    private node: SceneNode | null = null
    private index: number = -1

    execute(args: AddNodeArgs[]): void {
        // If args are provided, store them (initial execution)
        if (args.length > 0) {
            const arg = args[0]
            if (!arg) {
                throw new Error("AddNodeCommand requires arguments")
            }

            this.parent = arg.parent
            this.node = arg.node

            // Store the index where the node will be inserted
            if (arg.index !== undefined) {
                this.index = arg.index
            } else {
                this.index = this.parent.children.length
            }
        }

        // Execute using stored state (works for both initial and redo)
        if (!this.parent || !this.node) {
            throw new Error("Cannot execute: command not initialized")
        }

        // Add the node to the parent
        this.parent.addChild(this.node)
    }

    undo(): void {
        if (!this.parent || !this.node) {
            throw new Error("Cannot undo: command not executed")
        }

        this.parent.removeChild(this.node)
    }

    override validate(args: AddNodeArgs[]): CommandValidationResult {
        const arg = args[0]
        if (!arg) {
            return this.createValidationError("Missing arguments")
        }

        if (!arg.parent) {
            return this.createValidationError("Parent node is required")
        }

        if (!arg.node) {
            return this.createValidationError("Node to add is required")
        }

        if (arg.node === arg.parent) {
            return this.createValidationError(
                "Cannot add a node as a child of itself",
            )
        }

        return { valid: true }
    }
}

/**
 * Arguments for DeleteNodeCommand
 */
interface DeleteNodeArgs {
    node: SceneNode
}

/**
 * Command to delete a node from the scene graph
 * Supports undo by re-adding the node to its original parent
 */
class DeleteNodeCommand extends BaseCommand<DeleteNodeArgs> {
    name = "DeleteNode"
    description = "Delete a node from the scene graph"
    category = "scene" as const

    private node: SceneNode | null = null
    private parent: SceneNode | null = null
    private index: number = -1

    execute(args: DeleteNodeArgs[]): void {
        // If args are provided, store them (initial execution)
        if (args.length > 0) {
            const arg = args[0]
            if (!arg) {
                throw new Error("DeleteNodeCommand requires arguments")
            }

            this.node = arg.node
            this.parent = this.node.parent

            if (!this.parent) {
                throw new Error("Cannot delete node: node has no parent")
            }

            // Store the index of the node in its parent's children
            this.index = this.parent.children.indexOf(this.node)
        }

        // Execute using stored state (works for both initial and redo)
        if (!this.node || !this.parent) {
            throw new Error("Cannot execute: command not initialized")
        }

        // Remove the node from its parent
        this.parent.removeChild(this.node)
    }

    undo(): void {
        if (!this.node || !this.parent) {
            throw new Error("Cannot undo: command not executed")
        }

        // Re-add the node to its original parent
        this.parent.addChild(this.node)
    }

    override validate(args: DeleteNodeArgs[]): CommandValidationResult {
        const arg = args[0]
        if (!arg) {
            return this.createValidationError("Missing arguments")
        }

        if (!arg.node) {
            return this.createValidationError("Node to delete is required")
        }

        if (!arg.node.parent) {
            return this.createValidationError(
                "Cannot delete node: node has no parent",
            )
        }

        return { valid: true }
    }
}

/**
 * Arguments for ModifyPropertyCommand
 */
interface ModifyPropertyArgs {
    target: SceneNode
    property: string
    newValue: unknown
}

/**
 * Command to modify a property of a scene node
 * Supports undo by restoring the original value
 */
class ModifyPropertyCommand extends BaseCommand<ModifyPropertyArgs> {
    name = "ModifyProperty"
    description = "Modify a property of a scene node"
    category = "property" as const

    private target: SceneNode | null = null
    private property: string = ""
    private oldValue: unknown = null
    private newValue: unknown = null

    execute(args: ModifyPropertyArgs[]): void {
        // If args are provided, store them (initial execution)
        if (args.length > 0) {
            const arg = args[0]
            if (!arg) {
                throw new Error("ModifyPropertyCommand requires arguments")
            }

            this.target = arg.target
            this.property = arg.property
            this.newValue = arg.newValue

            // Store the old value before modifying
            this.oldValue = this.getPropertyValue(this.target, this.property)
        }

        // Execute using stored state (works for both initial and redo)
        if (!this.target) {
            throw new Error("Cannot execute: command not initialized")
        }

        // Set the new value
        this.setPropertyValue(this.target, this.property, this.newValue)
    }

    undo(): void {
        if (!this.target) {
            throw new Error("Cannot undo: command not executed")
        }

        // Restore the old value
        this.setPropertyValue(this.target, this.property, this.oldValue)
    }

    override validate(args: ModifyPropertyArgs[]): CommandValidationResult {
        const arg = args[0]
        if (!arg) {
            return this.createValidationError("Missing arguments")
        }

        if (!arg.target) {
            return this.createValidationError("Target node is required")
        }

        if (!arg.property) {
            return this.createValidationError("Property name is required")
        }

        // Validate that the property exists
        try {
            this.getPropertyValue(arg.target, arg.property)
        } catch {
            return this.createValidationError(
                `Property '${arg.property}' does not exist on target`,
            )
        }

        return { valid: true }
    }

    /**
     * Get a property value from an object using a property path
     */
    private getPropertyValue(target: SceneNode, property: string): unknown {
        const parts = property.split(".")
        let current = target as unknown as Record<string, unknown>

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i]
            if (part && current[part] !== undefined) {
                if (i === parts.length - 1) {
                    return current[part]
                }
                current = current[part] as Record<string, unknown>
            } else {
                throw new Error(`Property '${property}' does not exist`)
            }
        }

        return undefined
    }

    /**
     * Set a property value on an object using a property path
     */
    private setPropertyValue(
        target: SceneNode,
        property: string,
        value: unknown,
    ): void {
        const parts = property.split(".")
        let current = target as unknown as Record<string, unknown>

        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i]
            if (part && current[part] !== undefined) {
                current = current[part] as Record<string, unknown>
            } else {
                throw new Error(`Property '${property}' does not exist`)
            }
        }

        const finalProp = parts[parts.length - 1]
        if (finalProp && current[finalProp] !== undefined) {
            current[finalProp] = value
        } else {
            throw new Error(`Property '${property}' does not exist`)
        }
    }
}

/**
 * Arguments for AddKeyframeCommand
 */
interface AddKeyframeArgs {
    track: AnimationTrack
    time: number
    value: unknown
    interpolation?: InterpolationType
    easing?: EasingFunction
}

/**
 * Command to add a keyframe to an animation track
 * Supports undo by removing the keyframe
 */
class AddKeyframeCommand extends BaseCommand<AddKeyframeArgs> {
    name = "AddKeyframe"
    description = "Add a keyframe to an animation track"
    category = "animation" as const

    private track: AnimationTrack | null = null
    private keyframe: Keyframe | null = null

    execute(args: AddKeyframeArgs[]): void {
        // If args are provided, store them (initial execution)
        if (args.length > 0) {
            const arg = args[0]
            if (!arg) {
                throw new Error("AddKeyframeCommand requires arguments")
            }

            this.track = arg.track

            // Create the keyframe
            this.keyframe = new Keyframe(
                arg.time,
                arg.value,
                arg.interpolation,
                arg.easing,
            )
        }

        // Execute using stored state (works for both initial and redo)
        if (!this.track || !this.keyframe) {
            throw new Error("Cannot execute: command not initialized")
        }

        // Add the keyframe to the track
        this.track.addKeyframe(this.keyframe)
    }

    undo(): void {
        if (!this.track || !this.keyframe) {
            throw new Error("Cannot undo: command not executed")
        }

        // Remove the keyframe from the track
        this.track.removeKeyframe(this.keyframe)
    }

    override validate(args: AddKeyframeArgs[]): CommandValidationResult {
        const arg = args[0]
        if (!arg) {
            return this.createValidationError("Missing arguments")
        }

        if (!arg.track) {
            return this.createValidationError("Animation track is required")
        }

        if (arg.time === undefined || arg.time === null) {
            return this.createValidationError("Keyframe time is required")
        }

        if (arg.time < 0) {
            return this.createValidationError(
                "Keyframe time must be non-negative",
            )
        }

        if (arg.value === undefined) {
            return this.createValidationError("Keyframe value is required")
        }

        return { valid: true }
    }
}

export {
    AddNodeCommand,
    DeleteNodeCommand,
    ModifyPropertyCommand,
    AddKeyframeCommand,
}
export type { AddNodeArgs, DeleteNodeArgs, ModifyPropertyArgs, AddKeyframeArgs }
