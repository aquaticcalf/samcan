const std = @import("std");

pub const Vector2 = @Vector(2, f32);

pub fn create(x: f32, y: f32) Vector2 {
    return .{ x, y };
}

pub fn zero() Vector2 {
    return .{ 0, 0 };
}

pub fn unit() Vector2 {
    return .{ 1, 1 };
}

pub fn clone(v: Vector2) Vector2 {
    return .{ v[0], v[1] };
}

pub fn copy(v: Vector2, out: *Vector2) void {
    out[0] = v[0];
    out[1] = v[1];
}

pub fn set(x: f32, y: f32, out: *Vector2) void {
    out[0] = x;
    out[1] = y;
}

pub fn add(a: Vector2, b: Vector2, out: *Vector2) void {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
}

pub fn subtract(a: Vector2, b: Vector2, out: *Vector2) void {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
}

pub fn multiply(a: Vector2, b: f32, out: *Vector2) void {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
}

pub fn divide(a: Vector2, b: f32, out: *Vector2) void {
    out[0] = a[0] / b;
    out[1] = a[1] / b;
}

pub fn normalize(a: Vector2, out: *Vector2) void {
    const len = length(a);
    if (len > 0) {
        divide(a, len, out);
    } else {
        set(0, 0, out);
    }
}

pub fn lerp(a: Vector2, b: Vector2, t: f32, out: *Vector2) void {
    out[0] = a[0] + t * (b[0] - a[0]);
    out[1] = a[1] + t * (b[1] - a[1]);
}

pub fn dot(a: Vector2, b: Vector2) f32 {
    return a[0] * b[0] + a[1] * b[1];
}

pub fn cross(a: Vector2, b: Vector2) f32 {
    return a[0] * b[1] - a[1] * b[0];
}

pub fn lengthSquared(a: Vector2) f32 {
    return a[0] * a[0] + a[1] * a[1];
}

pub fn length(a: Vector2) f32 {
    return @sqrt(lengthSquared(a));
}

pub fn distanceSquared(a: Vector2, b: Vector2) f32 {
    var d: Vector2 = undefined;
    subtract(a, b, &d);
    return lengthSquared(d);
}

pub fn distance(a: Vector2, b: Vector2) f32 {
    return @sqrt(distanceSquared(a, b));
}

pub fn isEqual(a: Vector2, b: Vector2, epsilon: f32) bool {
    return @abs(a[0] - b[0]) < epsilon and @abs(a[1] - b[1]) < epsilon;
}

test "create" {
    const v = create(3, 4);
    try std.testing.expectEqual(@as(f32, 3), v[0]);
    try std.testing.expectEqual(@as(f32, 4), v[1]);
}

test "add" {
    var out: Vector2 = undefined;
    add(.{ 1, 2 }, .{ 3, 4 }, &out);
    try std.testing.expectEqual(@as(f32, 4), out[0]);
    try std.testing.expectEqual(@as(f32, 6), out[1]);
}

test "length" {
    try std.testing.expectEqual(@as(f32, 5), length(.{ 3, 4 }));
}

test "normalize" {
    var out: Vector2 = undefined;
    normalize(.{ 3, 4 }, &out);
    try std.testing.expect(isEqual(out, .{ 0.6, 0.8 }, 0.0001));
}

test "lerp" {
    var out: Vector2 = undefined;
    lerp(.{ 0, 0 }, .{ 10, 20 }, 0.5, &out);
    try std.testing.expectEqual(@as(f32, 5), out[0]);
    try std.testing.expectEqual(@as(f32, 10), out[1]);
}

test "dot" {
    try std.testing.expectEqual(@as(f32, 32), dot(.{ 3, 4 }, .{ 4, 5 }));
}

test "cross" {
    try std.testing.expectEqual(@as(f32, -2), cross(.{ 1, 2 }, .{ 3, 4 }));
}

test "distance" {
    try std.testing.expectEqual(@as(f32, 5), distance(.{ 0, 0 }, .{ 3, 4 }));
}

test "isEqual" {
    try std.testing.expect(isEqual(.{ 1, 2 }, .{ 1, 2 }, 0.0001));
    try std.testing.expect(!isEqual(.{ 1, 2 }, .{ 1, 2.5 }, 0.0001));
    try std.testing.expect(isEqual(.{ 1, 2 }, .{ 1.00005, 2.00005 }, 0.001));
}
