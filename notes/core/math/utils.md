## utils

Common math utility functions used across the codebase:

- lerp(a, b, t) -> linear interpolation between a and b

- clamp(value, min, max) -> clamp value between min and max

- map(value, inMin, inMax, outMin, outMax) -> map value between ranges

- approximately(a, b, epsilon?) -> check two numbers are approximately equal

- degToRad(degrees) -> convert degrees to radians

- radToDeg(radians) -> convert radians to degrees

- normalizeAngle(angle) -> normalize angle to [0, 2π)

- angleDelta(from, to) -> shortest signed angle difference

- smoothstep(edge0, edge1, x) -> cubic hermite interpolation in [0,1]

- smootherstep(edge0, edge1, x) -> quintic hermite interpolation in [0,1]

- inverseLerp(a, b, value) -> returns t such that lerp(a, b, t) === value

- pingPong(t, length) -> ping-pongs a value between 0 and length

- repeat(t, length) -> repeat value inside [0, length]

- sign(value) -> returns -1, 0, or 1

- cubicBezierInterpolate(t, p0, p1, p2, p3) -> evaluate cubic bezier interpolation

- quadraticBezier(t, p0, p1, p2) -> evaluate quadratic bezier interpolation

