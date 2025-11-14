import type { AssetType } from "../serialization"

/**
 * Base asset interface for runtime asset management
 */
export interface Asset {
    readonly id: string
    readonly type: AssetType
    readonly url: string
    readonly loaded: boolean
}

/**
 * Runtime image asset with bitmap data
 * Extends the renderer's ImageAsset with asset management metadata
 */
export interface RuntimeImageAsset extends Asset {
    readonly type: "image"
    readonly width: number
    readonly height: number
    readonly data: HTMLImageElement | ImageBitmap
}

/**
 * Font asset with FontFace
 */
export interface FontAsset extends Asset {
    readonly type: "font"
    readonly family: string
    readonly fontFace: FontFace
}

/**
 * Audio asset (placeholder for future implementation)
 */
export interface AudioAsset extends Asset {
    readonly type: "audio"
    readonly data: AudioBuffer
}
