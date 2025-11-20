## paint

Paint defines how shapes are filled or stroked. It supports both solid colors and gradients with compositing blend modes.

- BlendMode -> union type for compositing operations (normal, multiply, screen, overlay, darken, lighten, color-dodge, color-burn, hard-light, soft-light, difference, exclusion)

- GradientStop -> { offset: number, color: Color } — color at a position between 0 and 1

- LinearGradient -> { type: "linear", start: Vector2, end: Vector2, stops: GradientStop[] }

- RadialGradient -> { type: "radial", center: Vector2, radius: number, focal?: Vector2, stops: GradientStop[] }

- constructor -> private constructor(type: "solid" | "gradient", blendMode = "normal") — use static factory helpers

- type -> getter: returns paint type ("solid" | "gradient")

- color -> getter: returns solid Color if type is "solid"

- gradient -> getter: returns Gradient if type is "gradient"

- blendMode -> getter for current blend mode

- setBlendMode(mode) -> set the paint's blend mode

- solid(color, blendMode?) -> static factory for solid color paints

- linearGradient(start, end, stops, blendMode?) -> static factory for linear gradients (validates stops)

- radialGradient(center, radius, stops, focal?, blendMode?) -> static factory for radial gradients (validates stops)

- clone() -> clones this paint, creating new Color/Vector2 instances as needed

- evaluateGradient(t) -> clamps t to [0,1], finds surrounding gradient stops, and interpolates the color between them

- equals(other) -> checks type and blend mode; for solid paints compares colors, for gradients compares stop count, offsets, colors and type-specific properties (start/end or center/radius/focal)

- validateStops(stops) -> internal helper: throws if fewer than 2 stops, sorts by offset and clamps offsets to [0,1]

