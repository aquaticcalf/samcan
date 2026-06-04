const std = @import("std");
const vector2 = @import("vector2.zig");

pub const Rectangle = struct {
    position: vector2.Vector2,
    size: vector2.Vector2,
};

pub fn create(x: f32, y: f32, width: f32, height: f32) Rectangle {
    return .{ .position = .{ x, y }, .size = .{ width, height } };
}

pub fn fromVectors(position: vector2.Vector2, size: vector2.Vector2) Rectangle {
    return .{ .position = position, .size = size };
}

pub fn clone(r: Rectangle) Rectangle {
    return .{ r.position, r.size };
}

pub fn fromCenter(center: vector2.Vector2, size: vector2.Vector2, out: Rectangle) void {
    out.position = .{ center[0] - size[0] / 2, center[1] - size[1] / 2 };
    out.size = size;
}

pub fn topleft(r: Rectangle) vector2.Vector2 {
    return .{ r.position[0], r.position[1] };
}

pub fn topright(r: Rectangle) vector2.Vector2 {
    return .{ r.position[0] + r.size[0], r.position[1] };
}

pub fn bottomright(r: Rectangle) vector2.Vector2 {
    return .{ r.position[0] + r.size[0], r.position[1] + r.size[1] };
}

pub fn bottomleft(r: Rectangle) vector2.Vector2 {
    return .{ r.position[0], r.position[1] + r.size[1] };
}

test "create" {
    const r = create(1, 2, 3, 4);
    try std.testing.expectEqual(@as(f32, 1), r.position[0]);
    try std.testing.expectEqual(@as(f32, 2), r.position[1]);
    try std.testing.expectEqual(@as(f32, 3), r.size[0]);
    try std.testing.expectEqual(@as(f32, 4), r.size[1]);
}

test "fromVectors" {
    const r = fromVectors(.{ 1, 2 }, .{ 3, 4 });
    try std.testing.expectEqual(@as(f32, 1), r.position[0]);
    try std.testing.expectEqual(@as(f32, 2), r.position[1]);
    try std.testing.expectEqual(@as(f32, 3), r.size[0]);
    try std.testing.expectEqual(@as(f32, 4), r.size[1]);
}

test "clone" {
    const original = create(1, 2, 3, 4);
    const r = clone(original);
    try std.testing.expectEqual(@as(f32, 1), r.position[0]);
    try std.testing.expectEqual(@as(f32, 2), r.position[1]);
    try std.testing.expectEqual(@as(f32, 3), r.size[0]);
    try std.testing.expectEqual(@as(f32, 4), r.size[1]);
}

test "fromCenter" {
    var r: Rectangle = undefined;
    fromCenter(.{ 10, 20 }, .{ 4, 6 }, &r);
    try std.testing.expectEqual(@as(f32, 8), r.position[0]);
    try std.testing.expectEqual(@as(f32, 17), r.position[1]);
    try std.testing.expectEqual(@as(f32, 4), r.size[0]);
    try std.testing.expectEqual(@as(f32, 6), r.size[1]);
}

test "coordinates" {
    const r = create(1, 2, 3, 4);

    const tl = topleft(r);
    try std.testing.expectEqual(@as(f32, 1), tl[0]);
    try std.testing.expectEqual(@as(f32, 2), tl[1]);

    const tr = topright(r);
    try std.testing.expectEqual(@as(f32, 4), tr[0]);
    try std.testing.expectEqual(@as(f32, 2), tr[1]);

    const br = bottomright(r);
    try std.testing.expectEqual(@as(f32, 4), br[0]);
    try std.testing.expectEqual(@as(f32, 6), br[1]);

    const bl = bottomleft(r);
    try std.testing.expectEqual(@as(f32, 1), bl[0]);
    try std.testing.expectEqual(@as(f32, 6), bl[1]);
}
