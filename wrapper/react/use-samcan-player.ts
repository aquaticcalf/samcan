import type { RefObject } from "react"
import { useEffect, useRef, useState } from "react"
import {
    type AnimationPlayer,
    createPlayer,
    type LoadOptions,
    type PlayerConfig,
} from "../../core/api"

function deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true
    if (a == null || b == null) return a === b
    if (typeof a !== "object" || typeof b !== "object") return a === b
    const objA = a as Record<string, unknown>
    const objB = b as Record<string, unknown>
    const keysA = Object.keys(objA)
    const keysB = Object.keys(objB)
    if (keysA.length !== keysB.length) return false
    for (const key of keysA) {
        if (!keysB.includes(key)) return false
        if (!deepEqual(objA[key], objB[key])) return false
    }
    return true
}

export interface UseSamcanPlayerOptions {
    /**
     * URL of the animation to load. If omitted, the
     * hook only creates the player and leaves loading
     * to the caller via the returned instance.
     */
    src?: string

    /**
     * Whether to start playing immediately after load.
     * Overrides `config.autoplay` if provided.
     */
    autoplay?: boolean

    /**
     * Options forwarded to `AnimationPlayer.load`.
     */
    loadOptions?: LoadOptions

    /**
     * Additional player configuration. The `canvas`
     * property is managed by the hook and ignored.
     */
    config?: Omit<PlayerConfig, "canvas">
}

interface UseSamcanPlayerResult {
    canvasRef: RefObject<HTMLCanvasElement>
    player: AnimationPlayer | null
    isLoading: boolean
    error: Error | null
}

export function useSamcanPlayer(
    options: UseSamcanPlayerOptions = {},
): UseSamcanPlayerResult {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [player, setPlayer] = useState<AnimationPlayer | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    // Maintain a stable snapshot of options so React
    // callers can pass new object literals without
    // forcing the player to be recreated.
    const [stableOptions, setStableOptions] =
        useState<UseSamcanPlayerOptions>(options)

    useEffect(() => {
        if (!deepEqual(options, stableOptions)) {
            setStableOptions(options)
        }
    }, [options, stableOptions])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) {
            return
        }

        const { src, autoplay, loadOptions, config } = stableOptions

        let cancelled = false
        let currentPlayer: AnimationPlayer | null = null

        async function setup() {
            setIsLoading(true)
            setError(null)

            try {
                const baseConfig: PlayerConfig = {
                    canvas: canvas as HTMLCanvasElement,
                    ...(config ?? {}),
                }

                const createdPlayer = await createPlayer(baseConfig)
                if (cancelled) {
                    createdPlayer.destroy()
                    return
                }

                currentPlayer = createdPlayer
                setPlayer(createdPlayer)

                const effectiveAutoplay = autoplay ?? config?.autoplay ?? false

                if (src) {
                    await createdPlayer.load(src, loadOptions)
                    if (effectiveAutoplay) {
                        createdPlayer.play()
                    }
                }
            } catch (err) {
                if (cancelled) {
                    return
                }
                setError(err instanceof Error ? err : new Error(String(err)))
            } finally {
                if (!cancelled) {
                    setIsLoading(false)
                }
            }
        }

        void setup()

        return () => {
            cancelled = true
            if (currentPlayer) {
                currentPlayer.destroy()
                setPlayer(null)
            }
        }
    }, [stableOptions])

    return { canvasRef, player, isLoading, error }
}
