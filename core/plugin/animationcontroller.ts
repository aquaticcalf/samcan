import type { AnimationState } from "../animation/animationstate"
import type { Plugin } from "./plugin"

/**
 * AnimationController is a specialized plugin interface for controlling
 * animation state machine behavior. Controllers can hook into state transitions
 * and access animation data through a controlled API.
 *
 * Use cases:
 * - Custom transition logic based on game state
 * - Procedural animation modifications
 * - Animation event handling and coordination
 * - Dynamic parameter adjustments during playback
 */
export interface AnimationController extends Plugin {
    /**
     * Called when entering a new animation state.
     * Use this to initialize state-specific behavior or modify animation parameters.
     *
     * @param state - The animation state being entered
     */
    onStateEnter?(state: AnimationState): void

    /**
     * Called when exiting an animation state.
     * Use this to clean up state-specific resources or save state data.
     *
     * @param state - The animation state being exited
     */
    onStateExit?(state: AnimationState): void

    /**
     * Called during a state transition.
     * Use this to customize transition behavior or blend parameters.
     *
     * @param from - The state being transitioned from
     * @param to - The state being transitioned to
     * @param progress - Transition progress from 0 to 1
     */
    onTransition?(
        from: AnimationState,
        to: AnimationState,
        progress: number,
    ): void
}

/**
 * Type guard to check if a plugin implements the AnimationController interface
 */
export function isAnimationController(
    plugin: Plugin,
): plugin is AnimationController {
    const controller = plugin as Partial<AnimationController>

    // Check if at least one of the controller hooks is implemented
    return (
        typeof controller.onStateEnter === "function" ||
        typeof controller.onStateExit === "function" ||
        typeof controller.onTransition === "function"
    )
}
