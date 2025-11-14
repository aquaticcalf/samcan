import { describe, expect, test } from "bun:test"
import {
    StateTransition,
    EventCondition,
    BooleanCondition,
    NumberCondition,
    TimeCondition,
    type StateMachineContext,
} from "../core/animation"

describe("EventCondition", () => {
    test("evaluates to true when event is present", () => {
        const condition = new EventCondition("jump")
        const context: StateMachineContext = {
            booleans: new Map(),
            numbers: new Map(),
            events: new Set(["jump"]),
            stateTime: 0,
        }

        expect(condition.evaluate(context)).toBe(true)
    })

    test("evaluates to false when event is not present", () => {
        const condition = new EventCondition("jump")
        const context: StateMachineContext = {
            booleans: new Map(),
            numbers: new Map(),
            events: new Set(),
            stateTime: 0,
        }

        expect(condition.evaluate(context)).toBe(false)
    })

    test("has correct type", () => {
        const condition = new EventCondition("test")

        expect(condition.type).toBe("event")
    })

    test("exposes event name", () => {
        const condition = new EventCondition("myEvent")

        expect(condition.eventName).toBe("myEvent")
    })
})

describe("BooleanCondition", () => {
    test("evaluates to true when boolean matches expected value", () => {
        const condition = new BooleanCondition("isMoving", true)
        const context: StateMachineContext = {
            booleans: new Map([["isMoving", true]]),
            numbers: new Map(),
            events: new Set(),
            stateTime: 0,
        }

        expect(condition.evaluate(context)).toBe(true)
    })

    test("evaluates to false when boolean does not match expected value", () => {
        const condition = new BooleanCondition("isMoving", true)
        const context: StateMachineContext = {
            booleans: new Map([["isMoving", false]]),
            numbers: new Map(),
            events: new Set(),
            stateTime: 0,
        }

        expect(condition.evaluate(context)).toBe(false)
    })

    test("evaluates to false when boolean is not set", () => {
        const condition = new BooleanCondition("isMoving", true)
        const context: StateMachineContext = {
            booleans: new Map(),
            numbers: new Map(),
            events: new Set(),
            stateTime: 0,
        }

        expect(condition.evaluate(context)).toBe(false)
    })

    test("works with false expected value", () => {
        const condition = new BooleanCondition("isGrounded", false)
        const context: StateMachineContext = {
            booleans: new Map([["isGrounded", false]]),
            numbers: new Map(),
            events: new Set(),
            stateTime: 0,
        }

        expect(condition.evaluate(context)).toBe(true)
    })

    test("has correct type", () => {
        const condition = new BooleanCondition("test", true)

        expect(condition.type).toBe("boolean")
    })

    test("exposes input name and expected value", () => {
        const condition = new BooleanCondition("myInput", true)

        expect(condition.inputName).toBe("myInput")
        expect(condition.expectedValue).toBe(true)
    })
})

describe("NumberCondition", () => {
    test("evaluates equals operator correctly", () => {
        const condition = new NumberCondition("speed", "equals", 5.0)
        const context: StateMachineContext = {
            booleans: new Map(),
            numbers: new Map([["speed", 5.0]]),
            events: new Set(),
            stateTime: 0,
        }

        expect(condition.evaluate(context)).toBe(true)
    })

    test("evaluates notEquals operator correctly", () => {
        const condition = new NumberCondition("speed", "notEquals", 5.0)
        const context: StateMachineContext = {
            booleans: new Map(),
            numbers: new Map([["speed", 3.0]]),
            events: new Set(),
            stateTime: 0,
        }

        expect(condition.evaluate(context)).toBe(true)
    })

    test("evaluates greaterThan operator correctly", () => {
        const condition = new NumberCondition("speed", "greaterThan", 5.0)
        const context: StateMachineContext = {
            booleans: new Map(),
            numbers: new Map([["speed", 6.0]]),
            events: new Set(),
            stateTime: 0,
        }

        expect(condition.evaluate(context)).toBe(true)

        context.numbers.set("speed", 5.0)
        expect(condition.evaluate(context)).toBe(false)

        context.numbers.set("speed", 4.0)
        expect(condition.evaluate(context)).toBe(false)
    })

    test("evaluates greaterThanOrEqual operator correctly", () => {
        const condition = new NumberCondition(
            "speed",
            "greaterThanOrEqual",
            5.0,
        )
        const context: StateMachineContext = {
            booleans: new Map(),
            numbers: new Map([["speed", 6.0]]),
            events: new Set(),
            stateTime: 0,
        }

        expect(condition.evaluate(context)).toBe(true)

        context.numbers.set("speed", 5.0)
        expect(condition.evaluate(context)).toBe(true)

        context.numbers.set("speed", 4.0)
        expect(condition.evaluate(context)).toBe(false)
    })

    test("evaluates lessThan operator correctly", () => {
        const condition = new NumberCondition("speed", "lessThan", 5.0)
        const context: StateMachineContext = {
            booleans: new Map(),
            numbers: new Map([["speed", 4.0]]),
            events: new Set(),
            stateTime: 0,
        }

        expect(condition.evaluate(context)).toBe(true)

        context.numbers.set("speed", 5.0)
        expect(condition.evaluate(context)).toBe(false)

        context.numbers.set("speed", 6.0)
        expect(condition.evaluate(context)).toBe(false)
    })

    test("evaluates lessThanOrEqual operator correctly", () => {
        const condition = new NumberCondition("speed", "lessThanOrEqual", 5.0)
        const context: StateMachineContext = {
            booleans: new Map(),
            numbers: new Map([["speed", 4.0]]),
            events: new Set(),
            stateTime: 0,
        }

        expect(condition.evaluate(context)).toBe(true)

        context.numbers.set("speed", 5.0)
        expect(condition.evaluate(context)).toBe(true)

        context.numbers.set("speed", 6.0)
        expect(condition.evaluate(context)).toBe(false)
    })

    test("evaluates to false when number is not set", () => {
        const condition = new NumberCondition("speed", "greaterThan", 5.0)
        const context: StateMachineContext = {
            booleans: new Map(),
            numbers: new Map(),
            events: new Set(),
            stateTime: 0,
        }

        expect(condition.evaluate(context)).toBe(false)
    })

    test("has correct type", () => {
        const condition = new NumberCondition("test", "equals", 0)

        expect(condition.type).toBe("number")
    })

    test("exposes input name, operator, and threshold", () => {
        const condition = new NumberCondition("myInput", "greaterThan", 10.5)

        expect(condition.inputName).toBe("myInput")
        expect(condition.operator).toBe("greaterThan")
        expect(condition.threshold).toBe(10.5)
    })
})

describe("TimeCondition", () => {
    test("evaluates to true when state time exceeds duration", () => {
        const condition = new TimeCondition(2.0)
        const context: StateMachineContext = {
            booleans: new Map(),
            numbers: new Map(),
            events: new Set(),
            stateTime: 2.5,
        }

        expect(condition.evaluate(context)).toBe(true)
    })

    test("evaluates to true when state time equals duration", () => {
        const condition = new TimeCondition(2.0)
        const context: StateMachineContext = {
            booleans: new Map(),
            numbers: new Map(),
            events: new Set(),
            stateTime: 2.0,
        }

        expect(condition.evaluate(context)).toBe(true)
    })

    test("evaluates to false when state time is less than duration", () => {
        const condition = new TimeCondition(2.0)
        const context: StateMachineContext = {
            booleans: new Map(),
            numbers: new Map(),
            events: new Set(),
            stateTime: 1.5,
        }

        expect(condition.evaluate(context)).toBe(false)
    })

    test("throws error for negative duration", () => {
        expect(() => new TimeCondition(-1.0)).toThrow(
            "Time condition duration must be non-negative",
        )
    })

    test("has correct type", () => {
        const condition = new TimeCondition(1.0)

        expect(condition.type).toBe("time")
    })

    test("exposes duration", () => {
        const condition = new TimeCondition(3.5)

        expect(condition.duration).toBe(3.5)
    })
})

describe("StateTransition", () => {
    test("creates transition with required parameters", () => {
        const condition = new TimeCondition(2.0)
        const transition = new StateTransition("idle", "walk", [condition])

        expect(transition.from).toBe("idle")
        expect(transition.to).toBe("walk")
        expect(transition.conditions.length).toBe(1)
        expect(transition.duration).toBe(0)
        expect(transition.priority).toBe(0)
    })

    test("creates transition with optional parameters", () => {
        const condition = new TimeCondition(2.0)
        const transition = new StateTransition(
            "idle",
            "walk",
            [condition],
            0.5,
            10,
        )

        expect(transition.duration).toBe(0.5)
        expect(transition.priority).toBe(10)
    })

    test("throws error for negative duration", () => {
        const condition = new TimeCondition(2.0)

        expect(
            () => new StateTransition("idle", "walk", [condition], -1.0),
        ).toThrow("Transition duration must be non-negative")
    })

    test("allows setting duration", () => {
        const condition = new TimeCondition(2.0)
        const transition = new StateTransition("idle", "walk", [condition])

        transition.duration = 1.5

        expect(transition.duration).toBe(1.5)
    })

    test("throws error when setting negative duration", () => {
        const condition = new TimeCondition(2.0)
        const transition = new StateTransition("idle", "walk", [condition])

        expect(() => {
            transition.duration = -1.0
        }).toThrow("Transition duration must be non-negative")
    })

    test("allows setting priority", () => {
        const condition = new TimeCondition(2.0)
        const transition = new StateTransition("idle", "walk", [condition])

        transition.priority = 5

        expect(transition.priority).toBe(5)
    })

    test("canTransition returns true when all conditions are met", () => {
        const condition1 = new BooleanCondition("isMoving", true)
        const condition2 = new NumberCondition("speed", "greaterThan", 5.0)
        const transition = new StateTransition("idle", "walk", [
            condition1,
            condition2,
        ])

        const context: StateMachineContext = {
            booleans: new Map([["isMoving", true]]),
            numbers: new Map([["speed", 6.0]]),
            events: new Set(),
            stateTime: 0,
        }

        expect(transition.canTransition(context)).toBe(true)
    })

    test("canTransition returns false when any condition is not met", () => {
        const condition1 = new BooleanCondition("isMoving", true)
        const condition2 = new NumberCondition("speed", "greaterThan", 5.0)
        const transition = new StateTransition("idle", "walk", [
            condition1,
            condition2,
        ])

        const context: StateMachineContext = {
            booleans: new Map([["isMoving", true]]),
            numbers: new Map([["speed", 3.0]]),
            events: new Set(),
            stateTime: 0,
        }

        expect(transition.canTransition(context)).toBe(false)
    })

    test("canTransition returns true with no conditions", () => {
        const transition = new StateTransition("idle", "walk", [])

        const context: StateMachineContext = {
            booleans: new Map(),
            numbers: new Map(),
            events: new Set(),
            stateTime: 0,
        }

        expect(transition.canTransition(context)).toBe(true)
    })

    test("provides readonly access to conditions", () => {
        const condition = new TimeCondition(2.0)
        const transition = new StateTransition("idle", "walk", [condition])

        const conditions = transition.conditions

        expect(conditions.length).toBe(1)
        expect(conditions[0]).toBe(condition)
    })
})
