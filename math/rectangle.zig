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

pub fn fromCenter(center: vector2.Vector2, dimensions: vector2.Vector2, out: Rectangle) void {
    out.position = .{ center[0] - dimensions[0] / 2, center[1] - dimensions[1] / 2 };
    out.size = .{dimensions};
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
