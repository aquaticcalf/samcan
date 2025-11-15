import { ErrorCode, type ErrorContext, SamcanError } from "./samcanerror"

/**
 * Error thrown when animation operations fail
 */
export class AnimationError extends SamcanError {
    public readonly timelineId?: string
    public readonly trackId?: string
    public readonly stateId?: string

    constructor(message: string, code: ErrorCode, context?: ErrorContext) {
        super(message, code, context)
        this.name = "AnimationError"
        this.timelineId = context?.timelineId as string | undefined
        this.trackId = context?.trackId as string | undefined
        this.stateId = context?.stateId as string | undefined
    }

    /**
     * Create an invalid animation data error
     */
    static invalidData(reason: string, context?: ErrorContext): AnimationError {
        return new AnimationError(
            `Invalid animation data: ${reason}`,
            ErrorCode.INVALID_ANIMATION_DATA,
            context,
        )
    }

    /**
     * Create a timeline error
     */
    static timelineError(reason: string, timelineId?: string): AnimationError {
        return new AnimationError(
            `Timeline error: ${reason}`,
            ErrorCode.TIMELINE_ERROR,
            { timelineId, reason },
        )
    }

    /**
     * Create a keyframe error
     */
    static keyframeError(
        reason: string,
        context?: ErrorContext,
    ): AnimationError {
        return new AnimationError(
            `Keyframe error: ${reason}`,
            ErrorCode.KEYFRAME_ERROR,
            context,
        )
    }

    /**
     * Create a state machine error
     */
    static stateMachineError(reason: string, stateId?: string): AnimationError {
        return new AnimationError(
            `State machine error: ${reason}`,
            ErrorCode.STATE_MACHINE_ERROR,
            { stateId, reason },
        )
    }
}
