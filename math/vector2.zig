const std = @import("std");
const assert = std.debug.assert;

pub const Vector2 = @Vector(2, f32);

pub fn is_finite_vector(v: Vector2) bool {
    return @reduce(.And, v == v) and @reduce(.And, @abs(v) != @as(Vector2, @splat(std.math.inf(f32))));
}

pub fn create(x: f32, y: f32) Vector2 {
    assert(std.math.isFinite(x));
    assert(std.math.isFinite(y));

    return .{ x, y };
}

pub fn zero() Vector2 {
    return .{ 0, 0 };
}

pub fn ones() Vector2 {
    return .{ 1, 1 };
}

pub fn copy(v: Vector2) Vector2 {
    assert(is_finite_vector(v));

    return v;
}

pub fn set(x: f32, y: f32) Vector2 {
    assert(std.math.isFinite(x));
    assert(std.math.isFinite(y));

    return .{ x, y };
}

pub fn add(a: Vector2, b: Vector2) Vector2 {
    assert(is_finite_vector(a));
    assert(is_finite_vector(b));

    var final: Vector2 = undefined;
    final = a + b;
    return final;
}

pub fn subtract(a: Vector2, b: Vector2) Vector2 {
    assert(is_finite_vector(a));
    assert(is_finite_vector(b));

    var final: Vector2 = undefined;
    final = a - b;
    return final;
}

pub fn multiply(a: Vector2, b: f32) Vector2 {
    assert(is_finite_vector(a));
    assert(std.math.isFinite(b));

    var final: Vector2 = undefined;
    final = a * @as(Vector2, @splat(b));
    return final;
}

pub fn divide(a: Vector2, b: f32) Vector2 {
    assert(b != 0);

    assert(is_finite_vector(a));
    assert(std.math.isFinite(b));

    var final: Vector2 = undefined;
    final = a / @as(Vector2, @splat(b));
    return final;
}

pub fn normalize(a: Vector2) Vector2 {
    assert(is_finite_vector(a));

    const len = length(a);

    assert(len != 0);

    return divide(a, len);
}

pub fn lerp(a: Vector2, b: Vector2, t: f32) Vector2 {
    assert(t >= 0 and t <= 1);

    assert(is_finite_vector(a));
    assert(is_finite_vector(b));

    var final: Vector2 = undefined;
    final = .{ a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]) };
    return final;
}

pub fn dot(a: Vector2, b: Vector2) f32 {
    assert(is_finite_vector(a));
    assert(is_finite_vector(b));

    return a[0] * b[0] + a[1] * b[1];
}

pub fn cross(a: Vector2, b: Vector2) f32 {
    assert(is_finite_vector(a));
    assert(is_finite_vector(b));

    return a[0] * b[1] - a[1] * b[0];
}

pub fn length_squared(a: Vector2) f32 {
    assert(is_finite_vector(a));

    const result = a[0] * a[0] + a[1] * a[1];

    assert(result >= 0);

    return result;
}

pub fn length(a: Vector2) f32 {
    assert(is_finite_vector(a));

    const sq = length_squared(a);

    assert(sq >= 0);

    const result = @sqrt(sq);

    assert(result >= 0);

    assert(std.math.isFinite(result));

    return result;
}

pub fn distance_squared(a: Vector2, b: Vector2) f32 {
    assert(is_finite_vector(a));
    assert(is_finite_vector(b));

    const d = subtract(a, b);
    const result = length_squared(d);

    assert(result >= 0);

    return result;
}

pub fn distance(a: Vector2, b: Vector2) f32 {
    assert(is_finite_vector(a));
    assert(is_finite_vector(b));

    const sq = distance_squared(a, b);

    assert(sq >= 0);

    const result = @sqrt(sq);

    assert(result >= 0);

    assert(std.math.isFinite(result));

    return result;
}

pub fn is_equal(a: Vector2, b: Vector2, epsilon: f32) bool {
    assert(epsilon > 0);

    assert(is_finite_vector(a));
    assert(is_finite_vector(b));

    return @abs(a[0] - b[0]) < epsilon and @abs(a[1] - b[1]) < epsilon;
}

test "create produces a vector with the given components" {
    const v = create(3, 4);

    try std.testing.expectEqual(@as(f32, 3), v[0]);
    try std.testing.expectEqual(@as(f32, 4), v[1]);
}

test "zero and ones return the canonical basis vectors" {
    try std.testing.expectEqual(Vector2{ 0, 0 }, zero());
    try std.testing.expectEqual(Vector2{ 1, 1 }, ones());
}

test "copy returns a vector element-equal to its input" {
    const v = Vector2{ 3, 4 };

    try std.testing.expectEqual(v, copy(v));
}

test "add of two vectors is component-wise" {
    try std.testing.expectEqual(Vector2{ 4, 6 }, add(.{ 1, 2 }, .{ 3, 4 }));
}

test "subtract of two vectors is component-wise" {
    try std.testing.expectEqual(Vector2{ -2, -2 }, subtract(.{ 1, 2 }, .{ 3, 4 }));
}

test "multiply scales every component by the scalar" {
    try std.testing.expectEqual(Vector2{ 6, 8 }, multiply(.{ 3, 4 }, 2));
}

test "divide scales every component by the inverse of the scalar" {
    try std.testing.expectEqual(Vector2{ 1.5, 2 }, divide(.{ 3, 4 }, 2));
}

test "subtracting a vector from itself yields the zero vector" {
    const v = Vector2{ 3, 4 };

    try std.testing.expectEqual(zero(), subtract(v, v));
}

test "adding the zero vector is the identity" {
    const v = Vector2{ 3, 4 };

    try std.testing.expectEqual(v, add(v, zero()));
}

test "multiplying by zero yields the zero vector" {
    const v = Vector2{ 3, 4 };

    try std.testing.expectEqual(zero(), multiply(v, 0));
}

test "multiplying by one is the identity" {
    const v = Vector2{ 3, 4 };

    try std.testing.expectEqual(v, multiply(v, 1));
}

test "length of a 3-4-5 right triangle is 5" {
    try std.testing.expectEqual(@as(f32, 5), length(.{ 3, 4 }));
}

test "length of the zero vector is zero" {
    try std.testing.expectEqual(@as(f32, 0), length(.{ 0, 0 }));
}

test "length of a unit basis vector is one" {
    try std.testing.expect(std.math.approxEqAbs(f32, length(.{ 1, 0 }), 1.0, 1e-6));
    try std.testing.expect(std.math.approxEqAbs(f32, length(.{ 0, 1 }), 1.0, 1e-6));
}

test "distance between two identical vectors is zero" {
    try std.testing.expectEqual(@as(f32, 0), distance(.{ 1, 2 }, .{ 1, 2 }));
}

test "distance between the origin and a point equals the point's length" {
    try std.testing.expectEqual(length(.{ 3, 4 }), distance(.{ 0, 0 }, .{ 3, 4 }));
}

test "distance squared is the square of the distance" {
    const a = Vector2{ 1, 2 };
    const b = Vector2{ 4, 6 };

    try std.testing.expect(std.math.approxEqAbs(
        f32,
        distance_squared(a, b),
        distance(a, b) * distance(a, b),
        1e-6,
    ));
}

test "normalize produces a unit-length vector" {
    const v = normalize(.{ 3, 4 });

    try std.testing.expect(std.math.approxEqAbs(f32, length(v), 1.0, 1e-6));
}

test "normalize scales the components to a unit vector" {
    try std.testing.expect(is_equal(normalize(.{ 3, 4 }), .{ 0.6, 0.8 }, 0.0001));
}

test "lerp at t = 0.5 returns the midpoint" {
    try std.testing.expectEqual(Vector2{ 5, 10 }, lerp(.{ 0, 0 }, .{ 10, 20 }, 0.5));
}

test "lerp at t = 0 returns the first argument" {
    const a = Vector2{ 1, 2 };
    const b = Vector2{ 3, 4 };

    try std.testing.expectEqual(a, lerp(a, b, 0));
}

test "lerp at t = 1 returns the second argument" {
    const a = Vector2{ 1, 2 };
    const b = Vector2{ 3, 4 };

    try std.testing.expectEqual(b, lerp(a, b, 1));
}

test "dot of a vector with itself equals its length squared" {
    const v = Vector2{ 3, 4 };

    try std.testing.expectEqual(length_squared(v), dot(v, v));
}

test "dot of two perpendicular vectors is zero" {
    try std.testing.expectEqual(@as(f32, 0), dot(.{ 1, 0 }, .{ 0, 1 }));
}

test "cross is anti-commutative" {
    const a = Vector2{ 1, 2 };
    const b = Vector2{ 3, 4 };

    try std.testing.expectEqual(cross(a, b), -cross(b, a));
}

test "cross of a vector with itself is zero" {
    const v = Vector2{ 3, 4 };

    try std.testing.expectEqual(@as(f32, 0), cross(v, v));
}

test "is_equal returns true for identical vectors within epsilon" {
    try std.testing.expect(is_equal(.{ 1, 2 }, .{ 1, 2 }, 0.0001));
}

test "is_equal returns false when components differ by more than epsilon" {
    try std.testing.expect(!is_equal(.{ 1, 2 }, .{ 1, 2.5 }, 0.0001));
}

test "is_equal respects the epsilon tolerance" {
    try std.testing.expect(is_equal(.{ 1, 2 }, .{ 1.00005, 2.00005 }, 0.001));
    try std.testing.expect(!is_equal(.{ 1, 2 }, .{ 1.00005, 2.00005 }, 0.00001));
}
