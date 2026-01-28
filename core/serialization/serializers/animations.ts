import { AnimationState } from "../../animation/animationstate"
import { AnimationTrack } from "../../animation/animationtrack"
import { Easing } from "../../animation/easing"
import { Keyframe } from "../../animation/keyframe"
import { StateMachine } from "../../animation/statemachine"
import {
    BooleanCondition,
    EventCondition,
    NumberCondition,
    StateTransition,
    TimeCondition,
    type TransitionCondition,
} from "../../animation/statetransition"
import { Timeline } from "../../animation/timeline"
import type { SceneNode } from "../../scene/node"
import type { Artboard } from "../../scene/nodes/artboard"
import type {
    AnimationStateData,
    AnimationTrackData,
    KeyframeData,
    StateMachineData,
    StateTransitionData,
    TimelineData,
    TransitionConditionData,
} from "../types"
import type { PrimitiveSerializers } from "./primitives"

/**
 * Handles serialization and deserialization of animation-related objects
 * (Timeline, AnimationTrack, Keyframe, StateMachine, etc.)
 */
export class AnimationSerializers {
    constructor(private _primitives: PrimitiveSerializers) {}

    private _nodeIdMap: Map<SceneNode, string> = new Map()

    /**
     * Set the node ID map for serialization
     */
    setNodeIdMap(nodeIdMap: Map<SceneNode, string>): void {
        this._nodeIdMap = nodeIdMap
    }

    /**
     * Serialize a Timeline to TimelineData
     */
    serializeTimeline(timeline: Timeline): TimelineData {
        return {
            duration: timeline.duration,
            fps: timeline.fps,
            tracks: timeline.tracks.map((track) =>
                this.serializeAnimationTrack(track),
            ),
        }
    }

    /**
     * Deserialize a Timeline from TimelineData
     */
    deserializeTimeline(
        data: TimelineData,
        nodeMap: Map<string, SceneNode>,
    ): Timeline {
        const timeline = new Timeline(data.duration, data.fps)

        for (const trackData of data.tracks) {
            const track = this.deserializeAnimationTrack(trackData, nodeMap)
            timeline.addTrack(track)
        }

        return timeline
    }

    /**
     * Serialize an AnimationTrack to AnimationTrackData
     */
    serializeAnimationTrack(track: AnimationTrack): AnimationTrackData {
        const targetId = this._nodeIdMap.get(track.target)
        if (!targetId) {
            throw new Error(
                "Cannot serialize track: target node not found in ID map",
            )
        }

        return {
            targetNodeId: targetId,
            property: track.property,
            keyframes: track.keyframes.map((keyframe) =>
                this.serializeKeyframe(keyframe),
            ),
        }
    }

    /**
     * Deserialize an AnimationTrack from AnimationTrackData
     */
    deserializeAnimationTrack(
        data: AnimationTrackData,
        nodeMap: Map<string, SceneNode>,
    ): AnimationTrack {
        const target = nodeMap.get(data.targetNodeId)
        if (!target) {
            throw new Error(
                `Target node not found for track: ${data.targetNodeId}`,
            )
        }

        const track = new AnimationTrack(target, data.property)

        for (const keyframeData of data.keyframes) {
            const keyframe = this.deserializeKeyframe(keyframeData)
            track.addKeyframe(keyframe)
        }

        return track
    }

    /**
     * Serialize a Keyframe to KeyframeData
     */
    serializeKeyframe(keyframe: Keyframe): KeyframeData {
        const data: KeyframeData = {
            time: keyframe.time,
            value: keyframe.value,
            interpolation: keyframe.interpolation,
        }

        // Try to find the easing function name
        if (keyframe.easing) {
            const easingName = this.getEasingName(keyframe.easing)
            if (easingName) {
                data.easingName = easingName
            }
        }

        return data
    }

    /**
     * Deserialize a Keyframe from KeyframeData
     */
    deserializeKeyframe(data: KeyframeData): Keyframe {
        let easing: ((t: number) => number) | undefined

        // Resolve easing function by name
        if (data.easingName) {
            const easingFn = (Easing as Record<string, (t: number) => number>)[
                data.easingName
            ]
            if (easingFn) {
                easing = easingFn
            }
        }

        return new Keyframe(data.time, data.value, data.interpolation, easing)
    }

    /**
     * Serialize an AnimationState to AnimationStateData
     */
    serializeAnimationState(state: AnimationState): AnimationStateData {
        return {
            id: state.id,
            name: state.name,
            timeline: this.serializeTimeline(state.timeline),
            speed: state.speed,
            loop: state.loop,
        }
    }

    /**
     * Deserialize an AnimationState from AnimationStateData
     */
    deserializeAnimationState(
        data: AnimationStateData,
        nodeMap: Map<string, SceneNode>,
    ): AnimationState {
        const timeline = this.deserializeTimeline(data.timeline, nodeMap)
        return new AnimationState(
            data.id,
            data.name,
            timeline,
            data.speed,
            data.loop,
        )
    }

    /**
     * Serialize a StateMachine to StateMachineData
     */
    serializeStateMachine(
        stateMachine: StateMachine,
        id: string,
        name: string,
    ): StateMachineData {
        const states = Array.from(stateMachine.states.values()).map((state) =>
            this.serializeAnimationState(state),
        )

        const transitions = stateMachine.transitions.map((transition) =>
            this.serializeStateTransition(transition),
        )

        return {
            id,
            name,
            states,
            transitions,
            initialStateId: stateMachine.currentState?.id,
        }
    }

    /**
     * Deserialize a StateMachine from StateMachineData
     */
    deserializeStateMachine(
        data: StateMachineData,
        artboards: Artboard[],
    ): StateMachine {
        const stateMachine = new StateMachine()

        // Build a node map from all artboards for timeline deserialization
        const nodeMap = new Map<string, SceneNode>()
        for (const artboard of artboards) {
            this.buildNodeMap(artboard, nodeMap)
        }

        // Deserialize states
        for (const stateData of data.states) {
            const state = this.deserializeAnimationState(stateData, nodeMap)
            stateMachine.addState(state)
        }

        // Deserialize transitions
        for (const transitionData of data.transitions) {
            const transition = this.deserializeStateTransition(transitionData)
            stateMachine.addTransition(transition)
        }

        // Set initial state if specified
        if (data.initialStateId) {
            stateMachine.changeState(data.initialStateId)
        }

        return stateMachine
    }

    /**
     * Serialize a StateTransition to StateTransitionData
     */
    serializeStateTransition(transition: StateTransition): StateTransitionData {
        return {
            from: transition.from,
            to: transition.to,
            conditions: transition.conditions.map((condition) =>
                this.serializeTransitionCondition(condition),
            ),
            duration: transition.duration,
            priority: transition.priority,
        }
    }

    /**
     * Deserialize a StateTransition from StateTransitionData
     */
    deserializeStateTransition(data: StateTransitionData): StateTransition {
        const conditions = data.conditions.map((condData) =>
            this.deserializeTransitionCondition(condData),
        )

        return new StateTransition(
            data.from,
            data.to,
            conditions,
            data.duration,
            data.priority,
        )
    }

    /**
     * Serialize a TransitionCondition to TransitionConditionData
     */
    serializeTransitionCondition(condition: {
        type: string
        eventName?: string
        inputName?: string
        expectedValue?: boolean
        operator?: string
        threshold?: number
        duration?: number
    }): TransitionConditionData {
        const data: TransitionConditionData = {
            type: condition.type as TransitionConditionData["type"],
        }

        if (condition.eventName !== undefined) {
            data.eventName = condition.eventName
        }
        if (condition.inputName !== undefined) {
            data.inputName = condition.inputName
        }
        if (condition.expectedValue !== undefined) {
            data.expectedValue = condition.expectedValue
        }
        if (condition.operator !== undefined) {
            data.operator =
                condition.operator as TransitionConditionData["operator"]
        }
        if (condition.threshold !== undefined) {
            data.threshold = condition.threshold
        }
        if (condition.duration !== undefined) {
            data.duration = condition.duration
        }

        return data
    }

    /**
     * Deserialize a TransitionCondition from TransitionConditionData
     */
    deserializeTransitionCondition(
        data: TransitionConditionData,
    ): TransitionCondition {
        switch (data.type) {
            case "event":
                if (!data.eventName) {
                    throw new Error("Event condition missing eventName")
                }
                return new EventCondition(data.eventName)

            case "boolean":
                if (!data.inputName || data.expectedValue === undefined) {
                    throw new Error(
                        "Boolean condition missing inputName or expectedValue",
                    )
                }
                return new BooleanCondition(data.inputName, data.expectedValue)

            case "number":
                if (
                    !data.inputName ||
                    !data.operator ||
                    data.threshold === undefined
                ) {
                    throw new Error(
                        "Number condition missing inputName, operator, or threshold",
                    )
                }
                return new NumberCondition(
                    data.inputName,
                    data.operator,
                    data.threshold,
                )

            case "time":
                if (data.duration === undefined) {
                    throw new Error("Time condition missing duration")
                }
                return new TimeCondition(data.duration)

            default:
                throw new Error(`Unknown condition type: ${data.type}`)
        }
    }

    /**
     * Try to find the name of an easing function
     */
    private getEasingName(easingFn: (t: number) => number): string | undefined {
        // Check against known easing functions
        const easingEntries = Object.entries(Easing) as [
            string,
            (t: number) => number,
        ][]

        for (const [name, fn] of easingEntries) {
            if (fn === easingFn) {
                return name
            }
        }

        return undefined
    }

    /**
     * Build a node map from a scene graph
     */
    private buildNodeMap(
        node: SceneNode,
        nodeMap: Map<string, SceneNode>,
    ): void {
        // Generate an ID for this node if we're rebuilding the map
        // In a real implementation, nodes would have persistent IDs
        const id = `node_${nodeMap.size}`
        nodeMap.set(id, node)

        for (const child of node.children) {
            this.buildNodeMap(child, nodeMap)
        }
    }
}
