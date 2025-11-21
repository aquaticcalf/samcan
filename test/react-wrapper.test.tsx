import { describe, expect, test } from "bun:test"
import { setupDOM } from "./dom-setup"
import React, { StrictMode, useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import { SamcanPlayer } from "../wrapper/react/samcan-player"

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

            useEffect(() => {
                // Unmount after player is ready to also exercise cleanup
                if (readyPlayer) {
                    setMounted(false)
                }
            }, [readyPlayer])

            return mounted ? (
                <SamcanPlayer
                    width={320}
                    height={180}
                    onReady={(player) => {
                        readyPlayer = player
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
})
