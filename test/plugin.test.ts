import { describe, expect, test } from "bun:test"
import {
    type Plugin,
    type PluginMetadata,
    isPlugin,
    PluginRegistry,
    PluginRegistrationError,
    type AnimationController,
    isAnimationController,
} from "../core/plugin"
import { AnimationRuntime } from "../core/animation/animationruntime"
import { AnimationState, Timeline, StateMachine } from "../core/animation"

describe("Plugin Interface", () => {
    test("isPlugin validates correct plugin structure", () => {
        const validPlugin: Plugin = {
            metadata: {
                name: "test-plugin",
                version: "1.0.0",
            },
            initialize: () => {},
        }

        expect(isPlugin(validPlugin)).toBe(true)
    })

    test("isPlugin validates plugin with optional methods", () => {
        const validPlugin: Plugin = {
            metadata: {
                name: "test-plugin",
                version: "1.0.0",
                description: "A test plugin",
                author: "Test Author",
            },
            initialize: () => {},
            update: () => {},
            cleanup: () => {},
        }

        expect(isPlugin(validPlugin)).toBe(true)
    })

    test("isPlugin rejects null or undefined", () => {
        expect(isPlugin(null)).toBe(false)
        expect(isPlugin(undefined)).toBe(false)
    })

    test("isPlugin rejects non-object values", () => {
        expect(isPlugin("string")).toBe(false)
        expect(isPlugin(123)).toBe(false)
        expect(isPlugin(true)).toBe(false)
    })

    test("isPlugin rejects object without metadata", () => {
        const invalid = {
            initialize: () => {},
        }

        expect(isPlugin(invalid)).toBe(false)
    })

    test("isPlugin rejects object with invalid metadata", () => {
        const invalid = {
            metadata: {
                name: "test",
            },
            initialize: () => {},
        }

        expect(isPlugin(invalid)).toBe(false)
    })

    test("isPlugin rejects object without initialize method", () => {
        const invalid = {
            metadata: {
                name: "test-plugin",
                version: "1.0.0",
            },
        }

        expect(isPlugin(invalid)).toBe(false)
    })

    test("isPlugin rejects object with non-function update", () => {
        const invalid = {
            metadata: {
                name: "test-plugin",
                version: "1.0.0",
            },
            initialize: () => {},
            update: "not a function",
        }

        expect(isPlugin(invalid)).toBe(false)
    })

    test("isPlugin rejects object with non-function cleanup", () => {
        const invalid = {
            metadata: {
                name: "test-plugin",
                version: "1.0.0",
            },
            initialize: () => {},
            cleanup: 123,
        }

        expect(isPlugin(invalid)).toBe(false)
    })
})

describe("PluginRegistry", () => {
    test("initializes with empty plugin collection", () => {
        const runtime = new AnimationRuntime()
        const registry = new PluginRegistry(runtime)

        expect(registry.size).toBe(0)
        expect(registry.plugins.length).toBe(0)
    })

    test("registers a valid plugin", () => {
        const runtime = new AnimationRuntime()
        const registry = new PluginRegistry(runtime)

        let initialized = false
        const plugin: Plugin = {
            metadata: {
                name: "test-plugin",
                version: "1.0.0",
            },
            initialize: () => {
                initialized = true
            },
        }

        registry.register(plugin)

        expect(registry.size).toBe(1)
        expect(initialized).toBe(true)
        expect(registry.has("test-plugin")).toBe(true)
    })

    test("throws error when registering invalid plugin", () => {
        const runtime = new AnimationRuntime()
        const registry = new PluginRegistry(runtime)

        const invalid = {
            metadata: { name: "test" },
        }

        expect(() => registry.register(invalid)).toThrow(
            PluginRegistrationError,
        )
    })

    test("throws error when registering duplicate plugin name", () => {
        const runtime = new AnimationRuntime()
        const registry = new PluginRegistry(runtime)

        const plugin1: Plugin = {
            metadata: { name: "test-plugin", version: "1.0.0" },
            initialize: () => {},
        }

        const plugin2: Plugin = {
            metadata: { name: "test-plugin", version: "2.0.0" },
            initialize: () => {},
        }

        registry.register(plugin1)

        expect(() => registry.register(plugin2)).toThrow(
            'Plugin "test-plugin" is already registered',
        )
    })

    test("passes runtime to plugin initialize", () => {
        const runtime = new AnimationRuntime()
        const registry = new PluginRegistry(runtime)

        let receivedRuntime: AnimationRuntime | null = null
        const plugin: Plugin = {
            metadata: { name: "test-plugin", version: "1.0.0" },
            initialize: (rt) => {
                receivedRuntime = rt
            },
        }

        registry.register(plugin)

        expect(receivedRuntime).not.toBeNull()
        expect(receivedRuntime!).toBe(runtime)
    })

    test("wraps plugin initialization errors", () => {
        const runtime = new AnimationRuntime()
        const registry = new PluginRegistry(runtime)

        const plugin: Plugin = {
            metadata: { name: "test-plugin", version: "1.0.0" },
            initialize: () => {
                throw new Error("Init failed")
            },
        }

        expect(() => registry.register(plugin)).toThrow(
            'Failed to initialize plugin "test-plugin": Init failed',
        )
    })

    test("unregisters a plugin", () => {
        const runtime = new AnimationRuntime()
        const registry = new PluginRegistry(runtime)

        const plugin: Plugin = {
            metadata: { name: "test-plugin", version: "1.0.0" },
            initialize: () => {},
        }

        registry.register(plugin)
        const result = registry.unregister("test-plugin")

        expect(result).toBe(true)
        expect(registry.size).toBe(0)
        expect(registry.has("test-plugin")).toBe(false)
    })

    test("returns false when unregistering non-existent plugin", () => {
        const runtime = new AnimationRuntime()
        const registry = new PluginRegistry(runtime)

        const result = registry.unregister("nonexistent")

        expect(result).toBe(false)
    })

    test("calls cleanup when unregistering plugin", () => {
        const runtime = new AnimationRuntime()
        const registry = new PluginRegistry(runtime)

        let cleaned = false
        const plugin: Plugin = {
            metadata: { name: "test-plugin", version: "1.0.0" },
            initialize: () => {},
            cleanup: () => {
                cleaned = true
            },
        }

        registry.register(plugin)
        registry.unregister("test-plugin")

        expect(cleaned).toBe(true)
    })

    test("handles cleanup errors gracefully", () => {
        const runtime = new AnimationRuntime()
        const registry = new PluginRegistry(runtime)

        const plugin: Plugin = {
            metadata: { name: "test-plugin", version: "1.0.0" },
            initialize: () => {},
            cleanup: () => {
                throw new Error("Cleanup failed")
            },
        }

        registry.register(plugin)

        expect(() => registry.unregister("test-plugin")).not.toThrow()
        expect(registry.has("test-plugin")).toBe(false)
    })

    test("gets plugin by name", () => {
        const runtime = new AnimationRuntime()
        const registry = new PluginRegistry(runtime)

        const plugin: Plugin = {
            metadata: { name: "test-plugin", version: "1.0.0" },
            initialize: () => {},
        }

        registry.register(plugin)
        const retrieved = registry.get("test-plugin")

        expect(retrieved).toBe(plugin)
    })

    test("returns undefined for non-existent plugin", () => {
        const runtime = new AnimationRuntime()
        const registry = new PluginRegistry(runtime)

        const retrieved = registry.get("nonexistent")

        expect(retrieved).toBeUndefined()
    })

    test("provides readonly array of all plugins", () => {
        const runtime = new AnimationRuntime()
        const registry = new PluginRegistry(runtime)

        const plugin1: Plugin = {
            metadata: { name: "plugin1", version: "1.0.0" },
            initialize: () => {},
        }

        const plugin2: Plugin = {
            metadata: { name: "plugin2", version: "1.0.0" },
            initialize: () => {},
        }

        registry.register(plugin1)
        registry.register(plugin2)

        const plugins = registry.plugins

        expect(plugins.length).toBe(2)
        expect(plugins).toContain(plugin1)
        expect(plugins).toContain(plugin2)
    })

    test("clears all plugins", () => {
        const runtime = new AnimationRuntime()
        const registry = new PluginRegistry(runtime)

        const plugin1: Plugin = {
            metadata: { name: "plugin1", version: "1.0.0" },
            initialize: () => {},
        }

        const plugin2: Plugin = {
            metadata: { name: "plugin2", version: "1.0.0" },
            initialize: () => {},
        }

        registry.register(plugin1)
        registry.register(plugin2)
        registry.clear()

        expect(registry.size).toBe(0)
    })

    test("calls cleanup on all plugins when clearing", () => {
        const runtime = new AnimationRuntime()
        const registry = new PluginRegistry(runtime)

        let cleaned1 = false
        let cleaned2 = false

        const plugin1: Plugin = {
            metadata: { name: "plugin1", version: "1.0.0" },
            initialize: () => {},
            cleanup: () => {
                cleaned1 = true
            },
        }

        const plugin2: Plugin = {
            metadata: { name: "plugin2", version: "1.0.0" },
            initialize: () => {},
            cleanup: () => {
                cleaned2 = true
            },
        }

        registry.register(plugin1)
        registry.register(plugin2)
        registry.clear()

        expect(cleaned1).toBe(true)
        expect(cleaned2).toBe(true)
    })

    test("update calls update on all plugins with update method", () => {
        const runtime = new AnimationRuntime()
        const registry = new PluginRegistry(runtime)

        let updateCount1 = 0
        let updateCount2 = 0
        let receivedDelta1 = 0
        let receivedDelta2 = 0

        const plugin1: Plugin = {
            metadata: { name: "plugin1", version: "1.0.0" },
            initialize: () => {},
            update: (deltaTime) => {
                updateCount1++
                receivedDelta1 = deltaTime
            },
        }

        const plugin2: Plugin = {
            metadata: { name: "plugin2", version: "1.0.0" },
            initialize: () => {},
            update: (deltaTime) => {
                updateCount2++
                receivedDelta2 = deltaTime
            },
        }

        registry.register(plugin1)
        registry.register(plugin2)
        registry.update(16.67)

        expect(updateCount1).toBe(1)
        expect(updateCount2).toBe(1)
        expect(receivedDelta1).toBe(16.67)
        expect(receivedDelta2).toBe(16.67)
    })

    test("update skips plugins without update method", () => {
        const runtime = new AnimationRuntime()
        const registry = new PluginRegistry(runtime)

        const plugin: Plugin = {
            metadata: { name: "plugin1", version: "1.0.0" },
            initialize: () => {},
        }

        registry.register(plugin)

        expect(() => registry.update(16.67)).not.toThrow()
    })

    test("update handles plugin errors gracefully", () => {
        const runtime = new AnimationRuntime()
        const registry = new PluginRegistry(runtime)

        let updateCount = 0

        const plugin1: Plugin = {
            metadata: { name: "plugin1", version: "1.0.0" },
            initialize: () => {},
            update: () => {
                throw new Error("Update failed")
            },
        }

        const plugin2: Plugin = {
            metadata: { name: "plugin2", version: "1.0.0" },
            initialize: () => {},
            update: () => {
                updateCount++
            },
        }

        registry.register(plugin1)
        registry.register(plugin2)

        expect(() => registry.update(16.67)).not.toThrow()
        expect(updateCount).toBe(1)
    })
})

describe("AnimationRuntime Plugin Integration", () => {
    test("runtime has plugin registry", () => {
        const runtime = new AnimationRuntime()

        expect(runtime.plugins).toBeDefined()
        expect(runtime.plugins).toBeInstanceOf(PluginRegistry)
    })

    test("plugins can be registered through runtime", () => {
        const runtime = new AnimationRuntime()

        const plugin: Plugin = {
            metadata: { name: "test-plugin", version: "1.0.0" },
            initialize: () => {},
        }

        runtime.plugins.register(plugin)

        expect(runtime.plugins.has("test-plugin")).toBe(true)
    })

    test("plugins are cleared when runtime unloads", () => {
        const runtime = new AnimationRuntime()
        const timeline = new Timeline(5.0, 60)
        const artboard = new (require("../core/scene/nodes/artboard").Artboard)(
            "test",
            800,
            600,
        )

        let cleaned = false
        const plugin: Plugin = {
            metadata: { name: "test-plugin", version: "1.0.0" },
            initialize: () => {},
            cleanup: () => {
                cleaned = true
            },
        }

        runtime.plugins.register(plugin)

        runtime.load({ artboard, timeline })
        runtime.unload()

        expect(cleaned).toBe(true)
        expect(runtime.plugins.size).toBe(0)
    })
})

describe("AnimationController Interface", () => {
    test("isAnimationController validates controller with onStateEnter", () => {
        const controller: AnimationController = {
            metadata: { name: "test-controller", version: "1.0.0" },
            initialize: () => {},
            onStateEnter: () => {},
        }

        expect(isAnimationController(controller)).toBe(true)
    })

    test("isAnimationController validates controller with onStateExit", () => {
        const controller: AnimationController = {
            metadata: { name: "test-controller", version: "1.0.0" },
            initialize: () => {},
            onStateExit: () => {},
        }

        expect(isAnimationController(controller)).toBe(true)
    })

    test("isAnimationController validates controller with onTransition", () => {
        const controller: AnimationController = {
            metadata: { name: "test-controller", version: "1.0.0" },
            initialize: () => {},
            onTransition: () => {},
        }

        expect(isAnimationController(controller)).toBe(true)
    })

    test("isAnimationController validates controller with all hooks", () => {
        const controller: AnimationController = {
            metadata: { name: "test-controller", version: "1.0.0" },
            initialize: () => {},
            onStateEnter: () => {},
            onStateExit: () => {},
            onTransition: () => {},
        }

        expect(isAnimationController(controller)).toBe(true)
    })

    test("isAnimationController rejects plugin without controller hooks", () => {
        const plugin: Plugin = {
            metadata: { name: "test-plugin", version: "1.0.0" },
            initialize: () => {},
        }

        expect(isAnimationController(plugin)).toBe(false)
    })
})

describe("StateMachine Controller Integration", () => {
    test("adds controller to state machine", () => {
        const sm = new StateMachine()

        const controller: AnimationController = {
            metadata: { name: "test-controller", version: "1.0.0" },
            initialize: () => {},
            onStateEnter: () => {},
        }

        sm.addController(controller)

        expect(sm.controllers.length).toBe(1)
        expect(sm.controllers[0]).toBe(controller)
    })

    test("throws error when adding non-controller", () => {
        const sm = new StateMachine()

        const plugin: Plugin = {
            metadata: { name: "test-plugin", version: "1.0.0" },
            initialize: () => {},
        }

        expect(() => sm.addController(plugin as AnimationController)).toThrow(
            "Controller must implement AnimationController interface",
        )
    })

    test("does not add duplicate controllers", () => {
        const sm = new StateMachine()

        const controller: AnimationController = {
            metadata: { name: "test-controller", version: "1.0.0" },
            initialize: () => {},
            onStateEnter: () => {},
        }

        sm.addController(controller)
        sm.addController(controller)

        expect(sm.controllers.length).toBe(1)
    })

    test("removes controller from state machine", () => {
        const sm = new StateMachine()

        const controller: AnimationController = {
            metadata: { name: "test-controller", version: "1.0.0" },
            initialize: () => {},
            onStateEnter: () => {},
        }

        sm.addController(controller)
        const result = sm.removeController(controller)

        expect(result).toBe(true)
        expect(sm.controllers.length).toBe(0)
    })

    test("returns false when removing non-existent controller", () => {
        const sm = new StateMachine()

        const controller: AnimationController = {
            metadata: { name: "test-controller", version: "1.0.0" },
            initialize: () => {},
            onStateEnter: () => {},
        }

        const result = sm.removeController(controller)

        expect(result).toBe(false)
    })

    test("calls onStateEnter when entering a state", () => {
        const sm = new StateMachine()
        const timeline = new Timeline(5.0, 60)
        const state = new AnimationState("idle", "Idle", timeline)

        sm.addState(state)

        let enteredState: AnimationState | null = null
        const controller: AnimationController = {
            metadata: { name: "test-controller", version: "1.0.0" },
            initialize: () => {},
            onStateEnter: (s) => {
                enteredState = s
            },
        }

        sm.addController(controller)
        sm.changeState("idle")

        expect(enteredState).not.toBeNull()
        expect(enteredState!).toBe(state)
    })

    test("calls onStateExit when exiting a state", () => {
        const sm = new StateMachine()
        const timeline = new Timeline(5.0, 60)
        const state1 = new AnimationState("idle", "Idle", timeline)
        const state2 = new AnimationState("walk", "Walk", timeline)

        sm.addState(state1)
        sm.addState(state2)

        let exitedState: AnimationState | null = null
        const controller: AnimationController = {
            metadata: { name: "test-controller", version: "1.0.0" },
            initialize: () => {},
            onStateExit: (s) => {
                exitedState = s
            },
        }

        sm.addController(controller)
        sm.changeState("idle")
        sm.changeState("walk")

        expect(exitedState).not.toBeNull()
        expect(exitedState!).toBe(state1)
    })

    test("calls onTransition when transitioning between states", () => {
        const sm = new StateMachine()
        const timeline = new Timeline(5.0, 60)
        const state1 = new AnimationState("idle", "Idle", timeline)
        const state2 = new AnimationState("walk", "Walk", timeline)

        sm.addState(state1)
        sm.addState(state2)

        let fromState: AnimationState | null = null
        let toState: AnimationState | null = null
        let progress = 0

        const controller: AnimationController = {
            metadata: { name: "test-controller", version: "1.0.0" },
            initialize: () => {},
            onTransition: (from, to, p) => {
                fromState = from
                toState = to
                progress = p
            },
        }

        sm.addController(controller)
        sm.changeState("idle")
        sm.changeState("walk")

        expect(fromState).not.toBeNull()
        expect(toState).not.toBeNull()
        expect(fromState!).toBe(state1)
        expect(toState!).toBe(state2)
        expect(progress).toBe(1.0)
    })

    test("calls all controller hooks in order", () => {
        const sm = new StateMachine()
        const timeline = new Timeline(5.0, 60)
        const state1 = new AnimationState("idle", "Idle", timeline)
        const state2 = new AnimationState("walk", "Walk", timeline)

        sm.addState(state1)
        sm.addState(state2)

        const callOrder: string[] = []

        const controller: AnimationController = {
            metadata: { name: "test-controller", version: "1.0.0" },
            initialize: () => {},
            onStateEnter: () => {
                callOrder.push("enter")
            },
            onStateExit: () => {
                callOrder.push("exit")
            },
            onTransition: () => {
                callOrder.push("transition")
            },
        }

        sm.addController(controller)
        sm.changeState("idle")
        sm.changeState("walk")

        expect(callOrder).toEqual(["enter", "exit", "enter", "transition"])
    })

    test("handles controller errors gracefully", () => {
        const sm = new StateMachine()
        const timeline = new Timeline(5.0, 60)
        const state = new AnimationState("idle", "Idle", timeline)

        sm.addState(state)

        const controller: AnimationController = {
            metadata: { name: "test-controller", version: "1.0.0" },
            initialize: () => {},
            onStateEnter: () => {
                throw new Error("Controller error")
            },
        }

        sm.addController(controller)

        expect(() => sm.changeState("idle")).not.toThrow()
        expect(sm.currentState).toBe(state)
    })

    test("multiple controllers receive notifications", () => {
        const sm = new StateMachine()
        const timeline = new Timeline(5.0, 60)
        const state = new AnimationState("idle", "Idle", timeline)

        sm.addState(state)

        let controller1Called = false
        let controller2Called = false

        const controller1: AnimationController = {
            metadata: { name: "controller1", version: "1.0.0" },
            initialize: () => {},
            onStateEnter: () => {
                controller1Called = true
            },
        }

        const controller2: AnimationController = {
            metadata: { name: "controller2", version: "1.0.0" },
            initialize: () => {},
            onStateEnter: () => {
                controller2Called = true
            },
        }

        sm.addController(controller1)
        sm.addController(controller2)
        sm.changeState("idle")

        expect(controller1Called).toBe(true)
        expect(controller2Called).toBe(true)
    })

    test("controller error does not prevent other controllers from running", () => {
        const sm = new StateMachine()
        const timeline = new Timeline(5.0, 60)
        const state = new AnimationState("idle", "Idle", timeline)

        sm.addState(state)

        let controller2Called = false

        const controller1: AnimationController = {
            metadata: { name: "controller1", version: "1.0.0" },
            initialize: () => {},
            onStateEnter: () => {
                throw new Error("Controller 1 error")
            },
        }

        const controller2: AnimationController = {
            metadata: { name: "controller2", version: "1.0.0" },
            initialize: () => {},
            onStateEnter: () => {
                controller2Called = true
            },
        }

        sm.addController(controller1)
        sm.addController(controller2)
        sm.changeState("idle")

        expect(controller2Called).toBe(true)
    })
})
