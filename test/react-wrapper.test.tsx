import { describe, expect, test, spyOn } from "bun:test"
import { setupDOM } from "./dom-setup"
import React, { StrictMode, useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import { SamcanPlayer } from "../wrapper/react/samcan-player"
import * as api from "../core/api"

// Ensure DOM + canvas APIs are available
setupDOM()

function createContainer() {
    const container = document.createElement("div")
    document.body.appendChild(container)
    return container
}

describe("React wrapper - SamcanPlayer", () => {
    test("renders a canvas element", async () => {
        const container = createContainer()
        const root = createRoot(container)

        root.render(
            <StrictMode>
                <SamcanPlayer />
            </StrictMode>,
        )

        // Allow React to flush the initial render
        await new Promise((resolve) => setTimeout(resolve, 0))

        const canvas = container.querySelector("canvas")
        expect(canvas).not.toBeNull()

        root.unmount()
        container.remove()
    })

    test("invokes onReady with a player instance", async () => {
        const container = createContainer()
        const root = createRoot(container)

        let readyPlayer: unknown = null

        function TestComponent() {
            const [mounted, setMounted] = useState(true)
            const [player, setPlayer] = useState<unknown>(null)

            useEffect(() => {
                // Unmount after player is ready to also exercise cleanup
                if (player) {
                    setMounted(false)
                }
            }, [player])

            return mounted ? (
                <SamcanPlayer
                    width={320}
                    height={180}
                    onReady={(playerInstance) => {
                        readyPlayer = playerInstance
                        setPlayer(playerInstance)
                    }}
                    // Use canvas2d backend which is supported in jsdom via mocks
                    config={{ backend: "canvas2d" }}
                />
            ) : null
        }

        root.render(
            <StrictMode>
                <TestComponent />
            </StrictMode>,
        )

        // Allow React + player async setup to run
        await new Promise((resolve) => setTimeout(resolve, 50))

        expect(readyPlayer).not.toBeNull()

        root.unmount()
        container.remove()
    })

    test("recreates player only when options meaningfully change", async () => {
        const createPlayerSpy = spyOn(api, "createPlayer")

        const container = createContainer()
        const root = createRoot(container)

        function TestComponent() {
            const [tick, setTick] = useState(0)
            const [src, setSrc] = useState("/a.samcan")

            useEffect(() => {
                const id = setTimeout(() => {
                    // Trigger a re-render with new object literals but same values
                    setTick((t) => t + 1)
                    // And later actually change src to force a new player
                    setTimeout(() => {
                        setSrc("/b.samcan")
                    }, 20)
                }, 10)
                return () => clearTimeout(id)
            }, [])

            const config = {
                backend: "canvas2d" as const,
                loop: true,
                speed: 1,
            }
            const loadOptions = { preloadAssets: true }

            void tick

            return (
                <SamcanPlayer
                    src={src}
                    autoplay
                    config={{ ...config }}
                    loadOptions={{ ...loadOptions }}
                />
            )
        }

        root.render(<TestComponent />)

        // Wait for all async effects and src change
        await new Promise((resolve) => setTimeout(resolve, 200))

        // Initial mount + one change when src actually changes
        expect(createPlayerSpy.mock.calls.length).toBe(2)

        root.unmount()
        container.remove()

        createPlayerSpy.mockRestore()
    })
})
