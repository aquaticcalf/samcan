import type { RefObject } from "react"
import { useEffect, useRef, useState } from "react"
import {
    type AnimationPlayer,
    type LoadOptions,
    type PlayerConfig,
    createPlayer,
} from "../../core/api"

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
    const { src, autoplay, loadOptions, config } = options

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [player, setPlayer] = useState<AnimationPlayer | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    // Keep latest options in refs to avoid re-creating
    // the player unnecessarily.
    const latestOptionsRef = useRef<UseSamcanPlayerOptions>(options)
    latestOptionsRef.current = options

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) {
            return
        }

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
            }
        }
    }, [src, autoplay, loadOptions, config])

    return { canvasRef, player, isLoading, error }
}
