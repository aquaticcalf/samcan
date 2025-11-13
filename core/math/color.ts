/**
 * Color class with RGBA components (0-1 range)
 */
export class Color {
    constructor(
        public r: number = 0,
        public g: number = 0,
        public b: number = 0,
        public a: number = 1,
    ) {
        this.r = Math.max(0, Math.min(1, r))
        this.g = Math.max(0, Math.min(1, g))
        this.b = Math.max(0, Math.min(1, b))
        this.a = Math.max(0, Math.min(1, a))
    }

    /**
     * Convert to CSS rgba string
     */
    toRGBA(): string {
        return `rgba(${Math.round(this.r * 255)}, ${Math.round(this.g * 255)}, ${Math.round(this.b * 255)}, ${this.a})`
    }

    /**
     * Convert to CSS hex string
     */
    toHex(): string {
        const r = Math.round(this.r * 255)
            .toString(16)
            .padStart(2, "0")
        const g = Math.round(this.g * 255)
            .toString(16)
            .padStart(2, "0")
        const b = Math.round(this.b * 255)
            .toString(16)
            .padStart(2, "0")
        const a = Math.round(this.a * 255)
            .toString(16)
            .padStart(2, "0")
        return this.a === 1 ? `#${r}${g}${b}` : `#${r}${g}${b}${a}`
    }

    /**
     * Linear interpolation between this color and another
     */
    lerp(other: Color, t: number): Color {
        return new Color(
            this.r + (other.r - this.r) * t,
            this.g + (other.g - this.g) * t,
            this.b + (other.b - this.b) * t,
            this.a + (other.a - this.a) * t,
        )
    }

    /**
     * Create a copy of this color
     */
    clone(): Color {
        return new Color(this.r, this.g, this.b, this.a)
    }

    /**
     * Check if this color equals another color
     */
    equals(other: Color, epsilon: number = 0.0001): boolean {
        return (
            Math.abs(this.r - other.r) < epsilon &&
            Math.abs(this.g - other.g) < epsilon &&
            Math.abs(this.b - other.b) < epsilon &&
            Math.abs(this.a - other.a) < epsilon
        )
    }

    /**
     * Create a color from RGB values (0-255)
     */
    static fromRGB(r: number, g: number, b: number, a: number = 255): Color {
        return new Color(r / 255, g / 255, b / 255, a / 255)
    }

    /**
     * Create a color from hex string
     */
    static fromHex(hex: string): Color {
        const cleaned = hex.replace("#", "")
        const r = Number.parseInt(cleaned.substring(0, 2), 16) / 255
        const g = Number.parseInt(cleaned.substring(2, 4), 16) / 255
        const b = Number.parseInt(cleaned.substring(4, 6), 16) / 255
        const a =
            cleaned.length === 8
                ? Number.parseInt(cleaned.substring(6, 8), 16) / 255
                : 1
        return new Color(r, g, b, a)
    }

    /**
     * Predefined colors
     */
    static white(): Color {
        return new Color(1, 1, 1, 1)
    }

    static black(): Color {
        return new Color(0, 0, 0, 1)
    }

    static red(): Color {
        return new Color(1, 0, 0, 1)
    }

    static green(): Color {
        return new Color(0, 1, 0, 1)
    }

    static blue(): Color {
        return new Color(0, 0, 1, 1)
    }

    static transparent(): Color {
        return new Color(0, 0, 0, 0)
    }
}
