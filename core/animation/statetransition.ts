/**
 * Context object passed to transition conditions for evaluation
 * Contains state machine inputs and current state information
 */
export interface StateMachineContext {
    /** Boolean inputs set via setInput() */
    booleans: Map<string, boolean>
    /** Number inputs set via setInput() */
    numbers: Map<string, number>
    /** Events triggered via trigger() */
    events: Set<string>
    /** Current time in the active state */
    stateTime: number
}

/**
 * Condition types supported by state transitions
 */
export type TransitionConditionType = "event" | "boolean" | "number" | "time"

/**
 * Base interface for transition conditions
 * Conditions determine when a state transition should occur
 */
export interface TransitionCondition {
    /** The type of condition */
    readonly type: TransitionConditionType

    /**
     * Evaluate whether this condition is met
     * @param context The state machine context containing inputs and state
     * @returns true if the condition is satisfied, false otherwise
     */
    evaluate(context: StateMachineContext): boolean
}

/**
 * Event-based transition condition
 * Triggers when a specific event is fired via trigger()
 */
export class EventCondition implements TransitionCondition {
    readonly type = "event"
    private _eventName: string

    constructor(eventName: string) {
        this._eventName = eventName
    }

    get eventName(): string {
        return this._eventName
    }

    evaluate(context: StateMachineContext): boolean {
        return context.events.has(this._eventName)
    }
}

/**
 * Boolean-based transition condition
 * Triggers when a boolean input matches the expected value
 */
export class BooleanCondition implements TransitionCondition {
    readonly type = "boolean"
    private _inputName: string
    private _expectedValue: boolean

    constructor(inputName: string, expectedValue: boolean) {
        this._inputName = inputName
        this._expectedValue = expectedValue
    }

    get inputName(): string {
        return this._inputName
    }

    get expectedValue(): boolean {
        return this._expectedValue
    }

    evaluate(context: StateMachineContext): boolean {
        const value = context.booleans.get(this._inputName)
        return value === this._expectedValue
    }
}

/**
 * Comparison operators for number conditions
 */
export type NumberComparisonOperator =
    | "equals"
    | "notEquals"
    | "greaterThan"
    | "greaterThanOrEqual"
    | "lessThan"
    | "lessThanOrEqual"

/**
 * Number-based transition condition
 * Triggers when a number input satisfies a comparison with a threshold
 */
export class NumberCondition implements TransitionCondition {
    readonly type = "number"
    private _inputName: string
    private _operator: NumberComparisonOperator
    private _threshold: number

    constructor(
        inputName: string,
        operator: NumberComparisonOperator,
        threshold: number,
    ) {
        this._inputName = inputName
        this._operator = operator
        this._threshold = threshold
    }

    get inputName(): string {
        return this._inputName
    }

    get operator(): NumberComparisonOperator {
        return this._operator
    }

    get threshold(): number {
        return this._threshold
    }

    evaluate(context: StateMachineContext): boolean {
        const value = context.numbers.get(this._inputName)
        if (value === undefined) {
            return false
        }

        switch (this._operator) {
            case "equals":
                return Math.abs(value - this._threshold) < Number.EPSILON
            case "notEquals":
                return Math.abs(value - this._threshold) >= Number.EPSILON
            case "greaterThan":
                return value > this._threshold
            case "greaterThanOrEqual":
                return value >= this._threshold
            case "lessThan":
                return value < this._threshold
            case "lessThanOrEqual":
                return value <= this._threshold
        }
    }
}

/**
 * Time-based transition condition
 * Triggers when the current state has been active for a specified duration
 */
export class TimeCondition implements TransitionCondition {
    readonly type = "time"
    private _duration: number

    constructor(duration: number) {
        if (duration < 0) {
            throw new Error("Time condition duration must be non-negative")
        }
        this._duration = duration
    }

    get duration(): number {
        return this._duration
    }

    evaluate(context: StateMachineContext): boolean {
        return context.stateTime >= this._duration
    }
}

/**
 * StateTransition defines a transition from one state to another
 * Includes conditions that must be met and priority for conflict resolution
 */
export class StateTransition {
    private _from: string
    private _to: string
    private _conditions: TransitionCondition[]
    private _duration: number
    private _priority: number

    /**
     * Create a new state transition
     * @param from The ID of the source state
     * @param to The ID of the destination state
     * @param conditions Array of conditions that must all be met for the transition
     * @param duration Blend duration in seconds for smooth transitions (default: 0)
     * @param priority Priority for resolving conflicts when multiple transitions are valid (higher = more priority, default: 0)
     */
    constructor(
        from: string,
        to: string,
        conditions: TransitionCondition[],
        duration: number = 0,
        priority: number = 0,
    ) {
        if (duration < 0) {
            throw new Error("Transition duration must be non-negative")
        }

        this._from = from
        this._to = to
        this._conditions = conditions
        this._duration = duration
        this._priority = priority
    }

    /**
     * Get the source state ID
     */
    get from(): string {
        return this._from
    }

    /**
     * Get the destination state ID
     */
    get to(): string {
        return this._to
    }

    /**
     * Get the transition conditions
     */
    get conditions(): readonly TransitionCondition[] {
        return this._conditions
    }

    /**
     * Get the blend duration in seconds
     */
    get duration(): number {
        return this._duration
    }

    /**
     * Set the blend duration in seconds
     */
    set duration(value: number) {
        if (value < 0) {
            throw new Error("Transition duration must be non-negative")
        }
        this._duration = value
    }

    /**
     * Get the transition priority
     */
    get priority(): number {
        return this._priority
    }

    /**
     * Set the transition priority
     */
    set priority(value: number) {
        this._priority = value
    }

    /**
     * Evaluate whether this transition should occur
     * All conditions must be met for the transition to be valid
     * @param context The state machine context
     * @returns true if all conditions are satisfied, false otherwise
     */
    canTransition(context: StateMachineContext): boolean {
        // All conditions must be met
        return this._conditions.every((condition) =>
            condition.evaluate(context),
        )
    }
}
