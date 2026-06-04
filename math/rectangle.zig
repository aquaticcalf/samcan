const std = @import("std");
const assert = std.debug.assert;
const vector2 = @import("vector2.zig");

pub const Rectangle = struct {
    position: vector2.Vector2,
    size: vector2.Vector2,
};

pub fn create(x: f32, y: f32, width: f32, height: f32) Rectangle {
    assert(std.math.isFinite(x));
    assert(std.math.isFinite(y));

    assert(width >= 0);
    assert(height >= 0);

    return .{ .position = .{ x, y }, .size = .{ width, height } };
}

pub fn from_vectors(position: vector2.Vector2, size: vector2.Vector2) Rectangle {
    assert(vector2.is_finite_vector(position));

    assert(size[0] >= 0);
    assert(size[1] >= 0);

    return .{ .position = position, .size = size };
}

pub fn clone(r: Rectangle) Rectangle {
    assert(vector2.is_finite_vector(r.position));

    assert(r.size[0] >= 0);
    assert(r.size[1] >= 0);

    return r;
}

pub fn from_center(center: vector2.Vector2, size: vector2.Vector2) Rectangle {
    assert(vector2.is_finite_vector(center));

    assert(size[0] >= 0);
    assert(size[1] >= 0);

    var final: Rectangle = undefined;
    final.position = .{ center[0] - size[0] / 2, center[1] - size[1] / 2 };
    final.size = size;
    return final;
}

pub fn top_left(r: Rectangle) vector2.Vector2 {
    assert(vector2.is_finite_vector(r.position));

    assert(r.size[0] >= 0);
    assert(r.size[1] >= 0);

    return .{ r.position[0], r.position[1] };
}

pub fn top_right(r: Rectangle) vector2.Vector2 {
    assert(vector2.is_finite_vector(r.position));

    assert(r.size[0] >= 0);
    assert(r.size[1] >= 0);

    return .{ r.position[0] + r.size[0], r.position[1] };
}

pub fn bottom_right(r: Rectangle) vector2.Vector2 {
    assert(vector2.is_finite_vector(r.position));

    assert(r.size[0] >= 0);
    assert(r.size[1] >= 0);

    return .{ r.position[0] + r.size[0], r.position[1] + r.size[1] };
}

pub fn bottom_left(r: Rectangle) vector2.Vector2 {
    assert(vector2.is_finite_vector(r.position));

    assert(r.size[0] >= 0);
    assert(r.size[1] >= 0);

    return .{ r.position[0], r.position[1] + r.size[1] };
}

pub fn translate(r: Rectangle, delta_x: f32, delta_y: f32) Rectangle {
    assert(vector2.is_finite_vector(r.position));

    assert(r.size[0] >= 0);
    assert(r.size[1] >= 0);

    assert(std.math.isFinite(delta_x));
    assert(std.math.isFinite(delta_y));

    var final: Rectangle = undefined;
    final.position = .{ r.position[0] + delta_x, r.position[1] + delta_y };
    final.size = r.size;
    return final;
}

pub fn scale(r: Rectangle, factor: f32) Rectangle {
    assert(vector2.is_finite_vector(r.position));

    assert(r.size[0] >= 0);
    assert(r.size[1] >= 0);

    assert(std.math.isFinite(factor));

    assert(factor >= 0);

    var final: Rectangle = undefined;
    final.position = r.position;
    final.size = .{ r.size[0] * factor, r.size[1] * factor };
    return final;
}

test "create stores position and size in the expected fields" {
    const r = create(1, 2, 3, 4);

    try std.testing.expectEqual(@as(f32, 1), r.position[0]);
    try std.testing.expectEqual(@as(f32, 2), r.position[1]);
    try std.testing.expectEqual(@as(f32, 3), r.size[0]);
    try std.testing.expectEqual(@as(f32, 4), r.size[1]);
}

test "from_vectors wraps the two vectors into a rectangle" {
    const r = from_vectors(.{ 1, 2 }, .{ 3, 4 });

    try std.testing.expectEqual(@as(f32, 1), r.position[0]);
    try std.testing.expectEqual(@as(f32, 2), r.position[1]);
    try std.testing.expectEqual(@as(f32, 3), r.size[0]);
    try std.testing.expectEqual(@as(f32, 4), r.size[1]);
}

test "clone returns a rectangle element-equal to the original" {
    const original = create(1, 2, 3, 4);
    const r = clone(original);

    try std.testing.expectEqual(@as(f32, 1), r.position[0]);
    try std.testing.expectEqual(@as(f32, 2), r.position[1]);
    try std.testing.expectEqual(@as(f32, 3), r.size[0]);
    try std.testing.expectEqual(@as(f32, 4), r.size[1]);
}

test "from_center places the position at center minus half the size" {
    const r = from_center(.{ 10, 20 }, .{ 4, 6 });

    try std.testing.expectEqual(@as(f32, 8), r.position[0]);
    try std.testing.expectEqual(@as(f32, 17), r.position[1]);
    try std.testing.expectEqual(@as(f32, 4), r.size[0]);
    try std.testing.expectEqual(@as(f32, 6), r.size[1]);
}

test "from_center with zero size places the position exactly at the center" {
    const r = from_center(.{ 10, 20 }, .{ 0, 0 });

    try std.testing.expectEqual(@as(f32, 10), r.position[0]);
    try std.testing.expectEqual(@as(f32, 20), r.position[1]);
    try std.testing.expectEqual(@as(f32, 0), r.size[0]);
    try std.testing.expectEqual(@as(f32, 0), r.size[1]);
}

test "from_center with asymmetric size uses each axis independently" {
    const r = from_center(.{ 0, 0 }, .{ 3, 5 });

    try std.testing.expectEqual(@as(f32, -1.5), r.position[0]);
    try std.testing.expectEqual(@as(f32, -2.5), r.position[1]);
    try std.testing.expectEqual(@as(f32, 3), r.size[0]);
    try std.testing.expectEqual(@as(f32, 5), r.size[1]);
}

test "from_center then top_left returns the computed top-left corner" {
    const center = vector2.Vector2{ 10, 20 };
    const size = vector2.Vector2{ 4, 6 };
    const r = from_center(center, size);

    try std.testing.expectEqual(@as(f32, 8), top_left(r)[0]);
    try std.testing.expectEqual(@as(f32, 17), top_left(r)[1]);
}

test "top_left, top_right, bottom_right, bottom_left return the expected corners" {
    const r = create(1, 2, 3, 4);

    try std.testing.expectEqual(@as(f32, 1), top_left(r)[0]);
    try std.testing.expectEqual(@as(f32, 2), top_left(r)[1]);

    try std.testing.expectEqual(@as(f32, 4), top_right(r)[0]);
    try std.testing.expectEqual(@as(f32, 2), top_right(r)[1]);

    try std.testing.expectEqual(@as(f32, 4), bottom_right(r)[0]);
    try std.testing.expectEqual(@as(f32, 6), bottom_right(r)[1]);

    try std.testing.expectEqual(@as(f32, 1), bottom_left(r)[0]);
    try std.testing.expectEqual(@as(f32, 6), bottom_left(r)[1]);
}

test "corners of a rectangle placed at the origin return the expected values" {
    const r = create(0, 0, 3, 4);

    try std.testing.expectEqual(@as(f32, 0), top_left(r)[0]);
    try std.testing.expectEqual(@as(f32, 0), top_left(r)[1]);

    try std.testing.expectEqual(@as(f32, 3), top_right(r)[0]);
    try std.testing.expectEqual(@as(f32, 0), top_right(r)[1]);

    try std.testing.expectEqual(@as(f32, 3), bottom_right(r)[0]);
    try std.testing.expectEqual(@as(f32, 4), bottom_right(r)[1]);

    try std.testing.expectEqual(@as(f32, 0), bottom_left(r)[0]);
    try std.testing.expectEqual(@as(f32, 4), bottom_left(r)[1]);
}

test "translate with positive deltas moves the position and preserves the size" {
    const r = create(1, 2, 3, 4);
    const t = translate(r, 5, 6);

    try std.testing.expectEqual(@as(f32, 6), t.position[0]);
    try std.testing.expectEqual(@as(f32, 8), t.position[1]);
    try std.testing.expectEqual(@as(f32, 3), t.size[0]);
    try std.testing.expectEqual(@as(f32, 4), t.size[1]);
}

test "translate with negative deltas moves the rectangle in the opposite direction" {
    const r = create(10, 20, 3, 4);
    const t = translate(r, -5, -6);

    try std.testing.expectEqual(@as(f32, 5), t.position[0]);
    try std.testing.expectEqual(@as(f32, 14), t.position[1]);
    try std.testing.expectEqual(@as(f32, 3), t.size[0]);
    try std.testing.expectEqual(@as(f32, 4), t.size[1]);
}

test "translate with zero deltas returns a rectangle with the same position" {
    const r = create(1, 2, 3, 4);
    const t = translate(r, 0, 0);

    try std.testing.expectEqual(@as(f32, 1), t.position[0]);
    try std.testing.expectEqual(@as(f32, 2), t.position[1]);
    try std.testing.expectEqual(@as(f32, 3), t.size[0]);
    try std.testing.expectEqual(@as(f32, 4), t.size[1]);
}

test "scale multiplies the size and preserves the position" {
    const r = create(1, 2, 3, 4);
    const s = scale(r, 2);

    try std.testing.expectEqual(@as(f32, 1), s.position[0]);
    try std.testing.expectEqual(@as(f32, 2), s.position[1]);
    try std.testing.expectEqual(@as(f32, 6), s.size[0]);
    try std.testing.expectEqual(@as(f32, 8), s.size[1]);
}

test "scale by one is the identity" {
    const r = create(1, 2, 3, 4);
    const s = scale(r, 1);

    try std.testing.expectEqual(@as(f32, 1), s.position[0]);
    try std.testing.expectEqual(@as(f32, 2), s.position[1]);
    try std.testing.expectEqual(@as(f32, 3), s.size[0]);
    try std.testing.expectEqual(@as(f32, 4), s.size[1]);
}

test "scale by zero produces a rectangle with zero size" {
    const r = create(1, 2, 3, 4);
    const s = scale(r, 0);

    try std.testing.expectEqual(@as(f32, 1), s.position[0]);
    try std.testing.expectEqual(@as(f32, 2), s.position[1]);
    try std.testing.expectEqual(@as(f32, 0), s.size[0]);
    try std.testing.expectEqual(@as(f32, 0), s.size[1]);
}
