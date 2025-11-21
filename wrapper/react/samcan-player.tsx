import type { CSSProperties } from "react"
import React from "react"
import {
    useSamcanPlayer,
    type UseSamcanPlayerOptions,
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

    React.useEffect(() => {
        if (player && onReady) {
            onReady(player)
        }
    }, [player, onReady])

    const mergedStyle: CSSProperties = {
        display: "inline-block",
        position: "relative",
        ...style,
    }

    return (
        <div className={className} style={mergedStyle}>
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                style={{ display: "block", width: "100%", height: "100%" }}
            />
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
