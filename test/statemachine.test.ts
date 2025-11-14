import { describe, expect, test } from "bun:test"
import { StateMachine, AnimationState, Timeline } from "../core/animation"

describe("StateMachine", () => {
    test("initializes with no states and no current state", () => {
        const sm = new StateMachine()

        expect(sm.currentState).toBeNull()
        expect(sm.stateCount).toBe(0)
        expect(sm.currentTime).toBe(0)
    })

    test("adds states to the state machine", () => {
        const sm = new StateMachine()
        const timeline = new Timeline(5.0, 60)
        const state = new AnimationState("idle", "Idle", timeline)

        sm.addState(state)

        expect(sm.stateCount).toBe(1)
        expect(sm.hasState("idle")).toBe(true)
        expect(sm.getState("idle")).toBe(state)
    })

    test("throws error when adding duplicate state ID", () => {
        const sm = new StateMachine()
        const timeline = new Timeline(5.0, 60)
        const state1 = new AnimationState("idle", "Idle", timeline)
        const state2 = new AnimationState("idle", "Idle 2", timeline)

        sm.addState(state1)

        expect(() => sm.addState(state2)).toThrow(
            'State with id "idle" already exists',
        )
    })

    test("removes states from the state machine", () => {
        const sm = new StateMachine()
        const timeline = new Timeline(5.0, 60)
        const state = new AnimationState("idle", "Idle", timeline)

        sm.addState(state)
        const removed = sm.removeState("idle")

        expect(removed).toBe(true)
        expect(sm.stateCount).toBe(0)
        expect(sm.hasState("idle")).toBe(false)
    })

    test("returns false when removing non-existent state", () => {
        const sm = new StateMachine()

        const removed = sm.removeState("nonexistent")

        expect(removed).toBe(false)
    })

    test("deactivates current state when removing it", () => {
        const sm = new StateMachine()
        const timeline = new Timeline(5.0, 60)
        const state = new AnimationState("idle", "Idle", timeline)

        sm.addState(state)
        sm.changeState("idle")

        expect(state.active).toBe(true)

        sm.removeState("idle")

        expect(state.active).toBe(false)
        expect(sm.currentState).toBeNull()
    })

    test("changes to a different state", () => {
        const sm = new StateMachine()
        const timeline1 = new Timeline(5.0, 60)
        const timeline2 = new Timeline(3.0, 60)
        const state1 = new AnimationState("idle", "Idle", timeline1)
        const state2 = new AnimationState("walk", "Walk", timeline2)

        sm.addState(state1)
        sm.addState(state2)

        sm.changeState("idle")

        expect(sm.currentState).toBe(state1)
        expect(state1.active).toBe(true)
        expect(sm.currentTime).toBe(0)
    })

    test("throws error when changing to non-existent state", () => {
        const sm = new StateMachine()

        expect(() => sm.changeState("nonexistent")).toThrow(
            'State with id "nonexistent" does not exist',
        )
    })

    test("deactivates previous state when changing states", () => {
        const sm = new StateMachine()
        const timeline1 = new Timeline(5.0, 60)
        const timeline2 = new Timeline(3.0, 60)
        const state1 = new AnimationState("idle", "Idle", timeline1)
        const state2 = new AnimationState("walk", "Walk", timeline2)

        sm.addState(state1)
        sm.addState(state2)

        sm.changeState("idle")
        sm.changeState("walk")

        expect(state1.active).toBe(false)
        expect(state2.active).toBe(true)
        expect(sm.currentState).toBe(state2)
    })

    test("resets time when changing states", () => {
        const sm = new StateMachine()
        const timeline1 = new Timeline(5.0, 60)
        const timeline2 = new Timeline(3.0, 60)
        const state1 = new AnimationState("idle", "Idle", timeline1)
        const state2 = new AnimationState("walk", "Walk", timeline2)

        sm.addState(state1)
        sm.addState(state2)

        sm.changeState("idle")
        sm.update(2.5)

        expect(sm.currentTime).toBe(2.5)

        sm.changeState("walk")

        expect(sm.currentTime).toBe(0)
    })

    test("updates current state timeline", () => {
        const sm = new StateMachine()
        const timeline = new Timeline(5.0, 60)
        const state = new AnimationState("idle", "Idle", timeline)

        sm.addState(state)
        sm.changeState("idle")

        sm.update(1.0)

        expect(sm.currentTime).toBe(1.0)

        sm.update(0.5)

        expect(sm.currentTime).toBe(1.5)
    })

    test("does nothing when updating with no current state", () => {
        const sm = new StateMachine()

        sm.update(1.0)

        expect(sm.currentTime).toBe(0)
    })

    test("applies speed multiplier during update", () => {
        const sm = new StateMachine()
        const timeline = new Timeline(5.0, 60)
        const state = new AnimationState("idle", "Idle", timeline, 2.0)

        sm.addState(state)
        sm.changeState("idle")

        sm.update(1.0)

        expect(sm.currentTime).toBe(2.0)
    })

    test("handles looping states", () => {
        const sm = new StateMachine()
        const timeline = new Timeline(5.0, 60)
        const state = new AnimationState("idle", "Idle", timeline, 1.0, true)

        sm.addState(state)
        sm.changeState("idle")

        sm.update(6.0)

        expect(sm.currentTime).toBe(1.0)
    })

    test("clamps time to duration for non-looping states", () => {
        const sm = new StateMachine()
        const timeline = new Timeline(5.0, 60)
        const state = new AnimationState("idle", "Idle", timeline, 1.0, false)

        sm.addState(state)
        sm.changeState("idle")

        sm.update(10.0)

        expect(sm.currentTime).toBe(5.0)
    })

    test("sets current time manually", () => {
        const sm = new StateMachine()
        const timeline = new Timeline(5.0, 60)
        const state = new AnimationState("idle", "Idle", timeline)

        sm.addState(state)
        sm.changeState("idle")

        sm.currentTime = 2.5

        expect(sm.currentTime).toBe(2.5)
    })

    test("clamps manually set time to valid range", () => {
        const sm = new StateMachine()
        const timeline = new Timeline(5.0, 60)
        const state = new AnimationState("idle", "Idle", timeline)

        sm.addState(state)
        sm.changeState("idle")

        sm.currentTime = -1
        expect(sm.currentTime).toBe(0)

        sm.currentTime = 10
        expect(sm.currentTime).toBe(5.0)
    })

    test("does nothing when setting time with no current state", () => {
        const sm = new StateMachine()

        sm.currentTime = 2.5

        expect(sm.currentTime).toBe(0)
    })

    test("resets state machine", () => {
        const sm = new StateMachine()
        const timeline = new Timeline(5.0, 60)
        const state = new AnimationState("idle", "Idle", timeline)

        sm.addState(state)
        sm.changeState("idle")
        sm.update(2.5)

        sm.reset()

        expect(sm.currentState).toBeNull()
        expect(sm.currentTime).toBe(0)
        expect(state.active).toBe(false)
    })

    test("gets all state IDs", () => {
        const sm = new StateMachine()
        const timeline = new Timeline(5.0, 60)
        const state1 = new AnimationState("idle", "Idle", timeline)
        const state2 = new AnimationState("walk", "Walk", timeline)
        const state3 = new AnimationState("run", "Run", timeline)

        sm.addState(state1)
        sm.addState(state2)
        sm.addState(state3)

        const ids = sm.getStateIds()

        expect(ids).toContain("idle")
        expect(ids).toContain("walk")
        expect(ids).toContain("run")
        expect(ids.length).toBe(3)
    })

    test("provides readonly access to states map", () => {
        const sm = new StateMachine()
        const timeline = new Timeline(5.0, 60)
        const state = new AnimationState("idle", "Idle", timeline)

        sm.addState(state)

        const states = sm.states

        expect(states.get("idle")).toBe(state)
        expect(states.size).toBe(1)
    })
})

describe("StateMachine - Transitions", () => {
    test("adds transitions to the state machine", () => {
        const sm = new StateMachine()
        const timeline = new Timeline(5.0, 60)
        const state1 = new AnimationState("idle", "Idle", timeline)
        const state2 = new AnimationState("walk", "Walk", timeline)

        sm.addState(state1)
        sm.addState(state2)

        const { StateTransition, TimeCondition } = require("../core/animation")
        const transition = new StateTransition("idle", "walk", [
            new TimeCondition(2.0),
        ])

        sm.addTransition(transition)

        expect(sm.transitions.length).toBe(1)
        expect(sm.transitions[0]).toBe(transition)
    })

    test("throws error when adding transition with non-existent source state", () => {
        const sm = new StateMachine()
        const timeline = new Timeline(5.0, 60)
        const state = new AnimationState("walk", "Walk", timeline)

        sm.addState(state)

        const { StateTransition, TimeCondition } = require("../core/animation")
        const transition = new StateTransition("idle", "walk", [
            new TimeCondition(2.0),
        ])

        expect(() => sm.addTransition(transition)).toThrow(
            'Cannot add transition: source state "idle" does not exist',
        )
    })

    test("throws error when adding transition with non-existent destination state", () => {
        const sm = new StateMachine()
        const timeline = new Timeline(5.0, 60)
        const state = new AnimationState("idle", "Idle", timeline)

        sm.addState(state)

        const { StateTransition, TimeCondition } = require("../core/animation")
        const transition = new StateTransition("idle", "walk", [
            new TimeCondition(2.0),
        ])

        expect(() => sm.addTransition(transition)).toThrow(
            'Cannot add transition: destination state "walk" does not exist',
        )
    })

    test("removes transitions from the state machine", () => {
        const sm = new StateMachine()
        const timeline = new Timeline(5.0, 60)
        const state1 = new AnimationState("idle", "Idle", timeline)
        const state2 = new AnimationState("walk", "Walk", timeline)

        sm.addState(state1)
        sm.addState(state2)

        const { StateTransition, TimeCondition } = require("../core/animation")
        const transition = new StateTransition("idle", "walk", [
            new TimeCondition(2.0),
        ])

        sm.addTransition(transition)
        const removed = sm.removeTransition(transition)

        expect(removed).toBe(true)
        expect(sm.transitions.length).toBe(0)
    })

    test("returns false when removing non-existent transition", () => {
        const sm = new StateMachine()
        const timeline = new Timeline(5.0, 60)
        const state1 = new AnimationState("idle", "Idle", timeline)
        const state2 = new AnimationState("walk", "Walk", timeline)

        sm.addState(state1)
        sm.addState(state2)

        const { StateTransition, TimeCondition } = require("../core/animation")
        const transition = new StateTransition("idle", "walk", [
            new TimeCondition(2.0),
        ])

        const removed = sm.removeTransition(transition)

        expect(removed).toBe(false)
    })

    test("automatically transitions based on time condition", () => {
        const sm = new StateMachine()
        const timeline = new Timeline(5.0, 60)
        const state1 = new AnimationState("idle", "Idle", timeline)
        const state2 = new AnimationState("walk", "Walk", timeline)

        sm.addState(state1)
        sm.addState(state2)

        const { StateTransition, TimeCondition } = require("../core/animation")
        const transition = new StateTransition("idle", "walk", [
            new TimeCondition(2.0),
        ])

        sm.addTransition(transition)
        sm.changeState("idle")

        expect(sm.currentState).toBe(state1)

        sm.update(1.0)
        expect(sm.currentState).toBe(state1)

        sm.update(1.5)
        expect(sm.currentState).toBe(state2)
    })

    test("transitions based on event condition", () => {
        const sm = new StateMachine()
        const timeline = new Timeline(5.0, 60)
        const state1 = new AnimationState("idle", "Idle", timeline)
        const state2 = new AnimationState("jump", "Jump", timeline)

        sm.addState(state1)
        sm.addState(state2)

        const { StateTransition, EventCondition } = require("../core/animation")
        const transition = new StateTransition("idle", "jump", [
            new EventCondition("jumpPressed"),
        ])

        sm.addTransition(transition)
        sm.changeState("idle")

        sm.trigger("jumpPressed")
        sm.update(0.016)

        expect(sm.currentState).toBe(state2)
    })

    test("transitions based on boolean condition", () => {
        const sm = new StateMachine()
        const timeline = new Timeline(5.0, 60)
        const state1 = new AnimationState("idle", "Idle", timeline)
        const state2 = new AnimationState("walk", "Walk", timeline)

        sm.addState(state1)
        sm.addState(state2)

        const { StateTransition, BooleanCondition } =
            require("../core/animation")
        const transition = new StateTransition("idle", "walk", [
            new BooleanCondition("isMoving", true),
        ])

        sm.addTransition(transition)
        sm.changeState("idle")

        sm.setBooleanInput("isMoving", true)
        sm.update(0.016)

        expect(sm.currentState).toBe(state2)
    })

    test("transitions based on number condition", () => {
        const sm = new StateMachine()
        const timeline = new Timeline(5.0, 60)
        const state1 = new AnimationState("walk", "Walk", timeline)
        const state2 = new AnimationState("run", "Run", timeline)

        sm.addState(state1)
        sm.addState(state2)

        const { StateTransition, NumberCondition } =
            require("../core/animation")
        const transition = new StateTransition("walk", "run", [
            new NumberCondition("speed", "greaterThan", 5.0),
        ])

        sm.addTransition(transition)
        sm.changeState("walk")

        sm.setNumberInput("speed", 6.0)
        sm.update(0.016)

        expect(sm.currentState).toBe(state2)
    })

    test("prioritizes higher priority transitions", () => {
        const sm = new StateMachine()
        const timeline = new Timeline(5.0, 60)
        const state1 = new AnimationState("idle", "Idle", timeline)
        const state2 = new AnimationState("walk", "Walk", timeline)
        const state3 = new AnimationState("run", "Run", timeline)

        sm.addState(state1)
        sm.addState(state2)
        sm.addState(state3)

        const { StateTransition, BooleanCondition } =
            require("../core/animation")

        // Lower priority transition
        const transition1 = new StateTransition(
            "idle",
            "walk",
            [new BooleanCondition("isMoving", true)],
            0,
            1,
        )

        // Higher priority transition
        const transition2 = new StateTransition(
            "idle",
            "run",
            [new BooleanCondition("isMoving", true)],
            0,
            10,
        )

        sm.addTransition(transition1)
        sm.addTransition(transition2)
        sm.changeState("idle")

        sm.setBooleanInput("isMoving", true)
        sm.update(0.016)

        // Should transition to run (higher priority)
        expect(sm.currentState).toBe(state3)
    })

    test("requires all conditions to be met for transition", () => {
        const sm = new StateMachine()
        const timeline = new Timeline(5.0, 60)
        const state1 = new AnimationState("idle", "Idle", timeline)
        const state2 = new AnimationState("attack", "Attack", timeline)

        sm.addState(state1)
        sm.addState(state2)

        const { StateTransition, BooleanCondition, NumberCondition } =
            require("../core/animation")

        const transition = new StateTransition("idle", "attack", [
            new BooleanCondition("canAttack", true),
            new NumberCondition("energy", "greaterThanOrEqual", 10.0),
        ])

        sm.addTransition(transition)
        sm.changeState("idle")

        // Only one condition met
        sm.setBooleanInput("canAttack", true)
        sm.setNumberInput("energy", 5.0)
        sm.update(0.016)

        expect(sm.currentState).toBe(state1)

        // Both conditions met
        sm.setNumberInput("energy", 15.0)
        sm.update(0.016)

        expect(sm.currentState).toBe(state2)
    })

    test("clears events after each update", () => {
        const sm = new StateMachine()
        const timeline = new Timeline(5.0, 60)
        const state1 = new AnimationState("idle", "Idle", timeline)
        const state2 = new AnimationState("jump", "Jump", timeline)

        sm.addState(state1)
        sm.addState(state2)

        const { StateTransition, EventCondition } = require("../core/animation")
        const transition = new StateTransition("idle", "jump", [
            new EventCondition("jumpPressed"),
        ])

        sm.addTransition(transition)
        sm.changeState("idle")

        sm.trigger("jumpPressed")
        sm.update(0.016)

        expect(sm.currentState).toBe(state2)

        // Reset to idle
        sm.changeState("idle")

        // Event should be cleared, no transition should occur
        sm.update(0.016)

        expect(sm.currentState).toBe(state1)
    })

    test("gets and sets boolean inputs", () => {
        const sm = new StateMachine()

        sm.setBooleanInput("test", true)

        expect(sm.getBooleanInput("test")).toBe(true)

        sm.setBooleanInput("test", false)

        expect(sm.getBooleanInput("test")).toBe(false)
    })

    test("gets and sets number inputs", () => {
        const sm = new StateMachine()

        sm.setNumberInput("speed", 5.5)

        expect(sm.getNumberInput("speed")).toBe(5.5)

        sm.setNumberInput("speed", 10.0)

        expect(sm.getNumberInput("speed")).toBe(10.0)
    })

    test("returns undefined for non-existent inputs", () => {
        const sm = new StateMachine()

        expect(sm.getBooleanInput("nonexistent")).toBeUndefined()
        expect(sm.getNumberInput("nonexistent")).toBeUndefined()
    })

    test("setInput() automatically determines type for boolean values", () => {
        const sm = new StateMachine()

        sm.setInput("isActive", true)

        expect(sm.getBooleanInput("isActive")).toBe(true)

        sm.setInput("isActive", false)

        expect(sm.getBooleanInput("isActive")).toBe(false)
    })

    test("setInput() automatically determines type for number values", () => {
        const sm = new StateMachine()

        sm.setInput("speed", 5.5)

        expect(sm.getNumberInput("speed")).toBe(5.5)

        sm.setInput("speed", 10.0)

        expect(sm.getNumberInput("speed")).toBe(10.0)
    })

    test("setInput() works with transitions", () => {
        const sm = new StateMachine()
        const timeline = new Timeline(5.0, 60)
        const state1 = new AnimationState("idle", "Idle", timeline)
        const state2 = new AnimationState("walk", "Walk", timeline)

        sm.addState(state1)
        sm.addState(state2)

        const { StateTransition, BooleanCondition } =
            require("../core/animation")
        const transition = new StateTransition("idle", "walk", [
            new BooleanCondition("isMoving", true),
        ])

        sm.addTransition(transition)
        sm.changeState("idle")

        sm.setInput("isMoving", true)
        sm.update(0.016)

        expect(sm.currentState).toBe(state2)
    })

    test("removes all transitions from a state", () => {
        const sm = new StateMachine()
        const timeline = new Timeline(5.0, 60)
        const state1 = new AnimationState("idle", "Idle", timeline)
        const state2 = new AnimationState("walk", "Walk", timeline)
        const state3 = new AnimationState("run", "Run", timeline)

        sm.addState(state1)
        sm.addState(state2)
        sm.addState(state3)

        const { StateTransition, TimeCondition } = require("../core/animation")

        sm.addTransition(
            new StateTransition("idle", "walk", [new TimeCondition(1.0)]),
        )
        sm.addTransition(
            new StateTransition("idle", "run", [new TimeCondition(2.0)]),
        )
        sm.addTransition(
            new StateTransition("walk", "run", [new TimeCondition(1.0)]),
        )

        const removed = sm.removeTransitionsFrom("idle")

        expect(removed).toBe(2)
        expect(sm.transitions.length).toBe(1)
    })
})
