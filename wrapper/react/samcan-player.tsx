import type { CSSProperties } from "react"
import React from "react"
import {
    type UseSamcanPlayerOptions,
    useSamcanPlayer,
} from "./use-samcan-player"

export interface SamcanPlayerProps extends UseSamcanPlayerOptions {
    /**
     * Width of the canvas in CSS pixels.
     */
    width?: number

    /**
     * Height of the canvas in CSS pixels.
     */
    height?: number

    /**
     * Additional styles applied to the wrapping div.
     */
    style?: CSSProperties

    /**
     * Class name applied to the wrapping div.
     */
    className?: string

    /**
     * Called when the underlying player instance is ready.
     */
    onReady?: (player: ReturnType<typeof useSamcanPlayer>["player"]) => void
}

export function SamcanPlayer(props: SamcanPlayerProps) {
    const { width, height, style, className, onReady, ...options } = props

    const { canvasRef, player, isLoading, error } = useSamcanPlayer(options)

    // Store the latest onReady callback in a ref
    const onReadyRef = React.useRef(onReady)
    React.useEffect(() => {
        onReadyRef.current = onReady
    }, [onReady])

    React.useEffect(() => {
        if (player && onReadyRef.current) {
            onReadyRef.current(player)
        }
    }, [player])

    // Handle canvas resizing
    React.useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas || !player) return

        const updateCanvasSize = () => {
            const rect = canvas.getBoundingClientRect()
            const dpr = window.devicePixelRatio || 1
            const width = Math.floor(rect.width * dpr)
            const height = Math.floor(rect.height * dpr)

            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width
                canvas.height = height
                player.resize(width, height)
            }
        }

        // Initial size update
        updateCanvasSize()

        const resizeObserver = new ResizeObserver(updateCanvasSize)
        resizeObserver.observe(canvas)

        return () => {
            resizeObserver.disconnect()
        }
    }, [player, canvasRef])

    const mergedStyle: CSSProperties = {
        display: "inline-block",
        position: "relative",
        ...style,
    }

    const canvasStyle: CSSProperties = {
        display: "block",
        width: width ? `${width}px` : "100%",
        height: height ? `${height}px` : "100%",
    }

    return (
        <div className={className} style={mergedStyle}>
            <canvas ref={canvasRef} style={canvasStyle} />
            {isLoading && (
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(255,255,255,0.7)",
                        zIndex: 1,
                    }}
                >
                    Loading...
                </div>
            )}
            {error && (
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(255,0,0,0.1)",
                        color: "#b00",
                        zIndex: 2,
                    }}
                >
                    Error: {error.message || String(error)}
                </div>
            )}
        </div>
    )
}
