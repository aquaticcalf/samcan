import { AnimationState } from "./animationstate"
import { type StateMachineContext, StateTransition } from "./statetransition"

/**
 * StateMachine manages a collection of animation states and handles transitions between them
 * Provides state switching logic and updates the active state's timeline
 * Supports automatic transitions based on conditions and manual state changes
 */
export class StateMachine {
    private _states: Map<string, AnimationState> = new Map()
    private _currentState: AnimationState | null = null
    private _currentTime: number = 0
    private _transitions: StateTransition[] = []
    private _context: StateMachineContext = {
        booleans: new Map(),
        numbers: new Map(),
        events: new Set(),
        stateTime: 0,
    }

    /**
     * Get the currently active animation state
     */
    get currentState(): AnimationState | null {
        return this._currentState
    }

    /**
     * Get all states in the state machine
     */
    get states(): ReadonlyMap<string, AnimationState> {
        return this._states
    }

    /**
     * Get all transitions in the state machine
     */
    get transitions(): readonly StateTransition[] {
        return this._transitions
    }

    /**
     * Add a state to the state machine
     * @param state The animation state to add
     * @throws Error if a state with the same ID already exists
     */
    addState(state: AnimationState): void {
        if (this._states.has(state.id)) {
            throw new Error(`State with id "${state.id}" already exists`)
        }

        this._states.set(state.id, state)
    }

    /**
     * Remove a state from the state machine
     * @param stateId The ID of the state to remove
     * @returns true if the state was removed, false if it didn't exist
     */
    removeState(stateId: string): boolean {
        const state = this._states.get(stateId)
        if (!state) {
            return false
        }

        // If removing the current state, deactivate it first
        if (this._currentState === state) {
            this._currentState.deactivate()
            this._currentState = null
            this._currentTime = 0
        }

        return this._states.delete(stateId)
    }

    /**
     * Get a state by its ID
     * @param stateId The ID of the state to retrieve
     * @returns The animation state, or undefined if not found
     */
    getState(stateId: string): AnimationState | undefined {
        return this._states.get(stateId)
    }

    /**
     * Check if a state exists in the state machine
     * @param stateId The ID of the state to check
     * @returns true if the state exists, false otherwise
     */
    hasState(stateId: string): boolean {
        return this._states.has(stateId)
    }

    /**
     * Add a transition to the state machine
     * @param transition The state transition to add
     */
    addTransition(transition: StateTransition): void {
        // Validate that the from and to states exist
        if (!this._states.has(transition.from)) {
            throw new Error(
                `Cannot add transition: source state "${transition.from}" does not exist`,
            )
        }
        if (!this._states.has(transition.to)) {
            throw new Error(
                `Cannot add transition: destination state "${transition.to}" does not exist`,
            )
        }

        this._transitions.push(transition)
    }

    /**
     * Remove a transition from the state machine
     * @param transition The transition to remove
     * @returns true if the transition was removed, false if it wasn't found
     */
    removeTransition(transition: StateTransition): boolean {
        const index = this._transitions.indexOf(transition)
        if (index === -1) {
            return false
        }

        this._transitions.splice(index, 1)
        return true
    }

    /**
     * Remove all transitions from a specific state
     * @param stateId The ID of the state to remove transitions from
     * @returns The number of transitions removed
     */
    removeTransitionsFrom(stateId: string): number {
        const initialLength = this._transitions.length
        this._transitions = this._transitions.filter((t) => t.from !== stateId)
        return initialLength - this._transitions.length
    }

    /**
     * Trigger an event that can activate event-based transitions
     * @param eventName The name of the event to trigger
     */
    trigger(eventName: string): void {
        this._context.events.add(eventName)
    }

    /**
     * Set an input value for condition-based transitions
     * Automatically determines the type based on the value
     * @param name The name of the input
     * @param value The value (boolean or number)
     */
    setInput(name: string, value: boolean | number): void {
        if (typeof value === "boolean") {
            this._context.booleans.set(name, value)
        } else if (typeof value === "number") {
            this._context.numbers.set(name, value)
        }
    }

    /**
     * Set a boolean input value for boolean-based transitions
     * @param name The name of the boolean input
     * @param value The boolean value
     */
    setBooleanInput(name: string, value: boolean): void {
        this._context.booleans.set(name, value)
    }

    /**
     * Set a number input value for number-based transitions
     * @param name The name of the number input
     * @param value The number value
     */
    setNumberInput(name: string, value: number): void {
        this._context.numbers.set(name, value)
    }

    /**
     * Get a boolean input value
     * @param name The name of the boolean input
     * @returns The boolean value, or undefined if not set
     */
    getBooleanInput(name: string): boolean | undefined {
        return this._context.booleans.get(name)
    }

    /**
     * Get a number input value
     * @param name The name of the number input
     * @returns The number value, or undefined if not set
     */
    getNumberInput(name: string): number | undefined {
        return this._context.numbers.get(name)
    }

    /**
     * Switch to a different state
     * @param stateId The ID of the state to switch to
     * @throws Error if the state doesn't exist
     */
    changeState(stateId: string): void {
        const newState = this._states.get(stateId)
        if (!newState) {
            throw new Error(`State with id "${stateId}" does not exist`)
        }

        // Deactivate current state if there is one
        if (this._currentState) {
            this._currentState.deactivate()
        }

        // Activate new state
        this._currentState = newState
        this._currentState.activate()
        this._currentTime = 0
        this._context.stateTime = 0
    }

    /**
     * Update the state machine
     * Advances the current state's timeline based on delta time and speed
     * Evaluates transitions and switches states if conditions are met
     * @param deltaTime Time elapsed since last update in seconds
     */
    update(deltaTime: number): void {
        if (!this._currentState) {
            return
        }

        // Apply speed multiplier
        const adjustedDelta = deltaTime * this._currentState.speed

        // Update current time
        this._currentTime += adjustedDelta
        this._context.stateTime += adjustedDelta

        // Evaluate transitions before updating the timeline
        this._evaluateTransitions()

        // Handle looping
        if (
            this._currentState.loop &&
            this._currentTime >= this._currentState.duration
        ) {
            this._currentTime = this._currentTime % this._currentState.duration
        } else {
            // Clamp to duration if not looping
            this._currentTime = Math.min(
                this._currentTime,
                this._currentState.duration,
            )
        }

        // Evaluate the timeline at the current time
        this._currentState.evaluate(this._currentTime)

        // Clear events after evaluation (events are one-frame only)
        this._context.events.clear()
    }

    /**
     * Evaluate all transitions from the current state
     * If multiple transitions are valid, the one with highest priority is chosen
     * @private
     */
    private _evaluateTransitions(): void {
        if (!this._currentState) {
            return
        }

        // Find all valid transitions from the current state
        const validTransitions = this._transitions.filter(
            (transition) =>
                transition.from === this._currentState?.id &&
                transition.canTransition(this._context),
        )

        if (validTransitions.length === 0) {
            return
        }

        // Sort by priority (highest first) and take the first one
        validTransitions.sort((a, b) => b.priority - a.priority)
        const selectedTransition = validTransitions[0]

        if (selectedTransition) {
            // Perform the transition
            this.changeState(selectedTransition.to)
        }
    }

    /**
     * Get the current playback time of the active state
     * @returns The current time in seconds, or 0 if no state is active
     */
    get currentTime(): number {
        return this._currentTime
    }

    /**
     * Set the current playback time of the active state
     * @param time The time in seconds to seek to
     */
    set currentTime(time: number) {
        if (!this._currentState) {
            return
        }

        this._currentTime = Math.max(
            0,
            Math.min(time, this._currentState.duration),
        )
    }

    /**
     * Reset the state machine to its initial state
     * Deactivates the current state and resets time
     */
    reset(): void {
        if (this._currentState) {
            this._currentState.deactivate()
            this._currentState = null
        }
        this._currentTime = 0
    }

    /**
     * Get the number of states in the state machine
     */
    get stateCount(): number {
        return this._states.size
    }

    /**
     * Get all state IDs
     */
    getStateIds(): string[] {
        return Array.from(this._states.keys())
    }
}
