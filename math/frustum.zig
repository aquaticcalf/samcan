const std = @import("std");
const assert = std.debug.assert;
const vector2 = @import("vector2.zig");
const rectangle = @import("rectangle.zig");

pub const Frustum = struct {
    x_bounds: vector2.Vector2,
    y_bounds: vector2.Vector2,
    z_bounds: vector2.Vector2,
};

pub fn create(left: f32, right: f32, top: f32, bottom: f32, near: f32, far: f32) Frustum {
    assert(std.math.isFinite(left));
    assert(std.math.isFinite(right));
    assert(std.math.isFinite(top));
    assert(std.math.isFinite(bottom));
    assert(std.math.isFinite(near));
    assert(std.math.isFinite(far));

    assert(right >= left);
    assert(top >= bottom);
    assert(far >= near);
    assert(near >= 0);

    var final: Frustum = undefined;
    final.x_bounds = .{ left, right };
    final.y_bounds = .{ bottom, top };
    final.z_bounds = .{ near, far };
    return final;
}

pub fn from_bounds(min: vector2.Vector2, max: vector2.Vector2) Frustum {
    assert(vector2.is_finite_vector(min));
    assert(vector2.is_finite_vector(max));

    assert(max[0] >= min[0]);
    assert(max[1] >= min[1]);

    var final: Frustum = undefined;
    final.x_bounds = .{ min[0], max[0] };
    final.y_bounds = .{ min[1], max[1] };
    final.z_bounds = .{ 0, std.math.floatMax(f32) };
    return final;
}

pub fn from_rectangle(r: rectangle.Rectangle) Frustum {
    assert(vector2.is_finite_vector(r.position));

    assert(r.size[0] >= 0);
    assert(r.size[1] >= 0);

    var final: Frustum = undefined;
    final.x_bounds = .{ r.position[0], r.position[0] + r.size[0] };
    final.y_bounds = .{ r.position[1], r.position[1] + r.size[1] };
    final.z_bounds = .{ 0, std.math.floatMax(f32) };
    return final;
}

pub fn from_camera(position: vector2.Vector2, viewport: vector2.Vector2, zoom: f32) Frustum {
    assert(vector2.is_finite_vector(position));
    assert(vector2.is_finite_vector(viewport));
    assert(std.math.isFinite(zoom));
    assert(zoom > 0);

    const half_width = viewport[0] / (2 * zoom);
    const half_height = viewport[1] / (2 * zoom);

    var final: Frustum = undefined;
    final.x_bounds = .{ position[0] - half_width, position[0] + half_width };
    final.y_bounds = .{ position[1] - half_height, position[1] + half_height };
    final.z_bounds = .{ 0, std.math.floatMax(f32) };
    return final;
}

pub fn left_of(f: Frustum) f32 {
    return f.x_bounds[0];
}

pub fn right_of(f: Frustum) f32 {
    return f.x_bounds[1];
}

pub fn top_of(f: Frustum) f32 {
    return f.y_bounds[1];
}

pub fn bottom_of(f: Frustum) f32 {
    return f.y_bounds[0];
}

pub fn near_of(f: Frustum) f32 {
    return f.z_bounds[0];
}

pub fn far_of(f: Frustum) f32 {
    return f.z_bounds[1];
}

pub fn width_of(f: Frustum) f32 {
    return f.x_bounds[1] - f.x_bounds[0];
}

pub fn height_of(f: Frustum) f32 {
    return f.y_bounds[1] - f.y_bounds[0];
}

pub fn set_bounds(left: f32, right: f32, top: f32, bottom: f32, near: f32, far: f32) Frustum {
    assert(std.math.isFinite(left));
    assert(std.math.isFinite(right));
    assert(std.math.isFinite(top));
    assert(std.math.isFinite(bottom));
    assert(std.math.isFinite(near));
    assert(std.math.isFinite(far));

    assert(right >= left);
    assert(top >= bottom);
    assert(far >= near);
    assert(near >= 0);

    var final: Frustum = undefined;
    final.x_bounds = .{ left, right };
    final.y_bounds = .{ bottom, top };
    final.z_bounds = .{ near, far };
    return final;
}

pub fn clone(f: Frustum) Frustum {
    var final: Frustum = undefined;
    final.x_bounds = f.x_bounds;
    final.y_bounds = f.y_bounds;
    final.z_bounds = f.z_bounds;
    return final;
}

pub fn expand(f: Frustum, margin: f32) Frustum {
    assert(std.math.isFinite(margin));
    assert(margin >= 0);

    var final: Frustum = undefined;
    final.x_bounds = .{ f.x_bounds[0] - margin, f.x_bounds[1] + margin };
    final.y_bounds = .{ f.y_bounds[0] - margin, f.y_bounds[1] + margin };
    final.z_bounds = f.z_bounds;
    return final;
}

pub fn intersects_rectangle(f: Frustum, r: rectangle.Rectangle) bool {
    const rect_left = r.position[0];
    const rect_right = r.position[0] + r.size[0];
    const rect_top = r.position[1] + r.size[1];
    const rect_bottom = r.position[1];

    return !(rect_right < f.x_bounds[0] or rect_left > f.x_bounds[1] or rect_bottom > f.y_bounds[1] or rect_top < f.y_bounds[0]);
}

pub fn contains_rectangle(f: Frustum, r: rectangle.Rectangle) bool {
    const rect_left = r.position[0];
    const rect_right = r.position[0] + r.size[0];
    const rect_top = r.position[1] + r.size[1];
    const rect_bottom = r.position[1];

    return rect_left >= f.x_bounds[0] and rect_right <= f.x_bounds[1] and rect_bottom >= f.y_bounds[0] and rect_top <= f.y_bounds[1];
}

pub fn contains_point(f: Frustum, x: f32, y: f32) bool {
    return x >= f.x_bounds[0] and x <= f.x_bounds[1] and y >= f.y_bounds[0] and y <= f.y_bounds[1];
}

pub fn cull_rectangle(f: Frustum, r: rectangle.Rectangle) bool {
    return !intersects_rectangle(f, r);
}

pub fn is_empty(f: Frustum) bool {
    return f.x_bounds[1] <= f.x_bounds[0] or f.y_bounds[1] <= f.y_bounds[0];
}

pub fn equals(f1: Frustum, f2: Frustum) bool {
    return f1.x_bounds[0] == f2.x_bounds[0] and
        f1.x_bounds[1] == f2.x_bounds[1] and
        f1.y_bounds[0] == f2.y_bounds[0] and
        f1.y_bounds[1] == f2.y_bounds[1] and
        f1.z_bounds[0] == f2.z_bounds[0] and
        f1.z_bounds[1] == f2.z_bounds[1];
}

pub fn area_of(f: Frustum) f32 {
    return width_of(f) * height_of(f);
}

pub fn center_of(f: Frustum) vector2.Vector2 {
    var final: vector2.Vector2 = undefined;
    final = .{ (f.x_bounds[0] + f.x_bounds[1]) / 2, (f.y_bounds[0] + f.y_bounds[1]) / 2 };
    return final;
}

pub fn translate(f: Frustum, delta: vector2.Vector2) Frustum {
    assert(vector2.is_finite_vector(delta));

    var final: Frustum = undefined;
    final.x_bounds = .{ f.x_bounds[0] + delta[0], f.x_bounds[1] + delta[0] };
    final.y_bounds = .{ f.y_bounds[0] + delta[1], f.y_bounds[1] + delta[1] };
    final.z_bounds = f.z_bounds;
    return final;
}

pub fn intersection_rectangle(f: Frustum, r: rectangle.Rectangle) ?rectangle.Rectangle {
    const left = @max(f.x_bounds[0], r.position[0]);
    const right = @min(f.x_bounds[1], r.position[0] + r.size[0]);
    const bottom = @max(f.y_bounds[0], r.position[1]);
    const top = @min(f.y_bounds[1], r.position[1] + r.size[1]);

    if (left >= right or bottom >= top) {
        return null;
    }

    var final: rectangle.Rectangle = undefined;
    final.position = .{ left, bottom };
    final.size = .{ right - left, top - bottom };
    return final;
}

test "create stores left, right, top, bottom, near, far in the expected fields" {
    const f = create(-10, 10, 20, -20, 0, 100);

    try std.testing.expectEqual(@as(f32, -10), f.x_bounds[0]);
    try std.testing.expectEqual(@as(f32, 10), f.x_bounds[1]);
    try std.testing.expectEqual(@as(f32, -20), f.y_bounds[0]);
    try std.testing.expectEqual(@as(f32, 20), f.y_bounds[1]);
    try std.testing.expectEqual(@as(f32, 0), f.z_bounds[0]);
    try std.testing.expectEqual(@as(f32, 100), f.z_bounds[1]);
}

test "create with equal left and right produces a frustum with zero width" {
    const f = create(5, 5, 10, 0, 0, 100);

    try std.testing.expectEqual(@as(f32, 5), f.x_bounds[0]);
    try std.testing.expectEqual(@as(f32, 5), f.x_bounds[1]);
}

test "from_bounds wraps the two vectors into a frustum with near=0 and far=MAX" {
    const f = from_bounds(.{ -10, -20 }, .{ 10, 20 });

    try std.testing.expectEqual(@as(f32, -10), f.x_bounds[0]);
    try std.testing.expectEqual(@as(f32, 10), f.x_bounds[1]);
    try std.testing.expectEqual(@as(f32, -20), f.y_bounds[0]);
    try std.testing.expectEqual(@as(f32, 20), f.y_bounds[1]);
    try std.testing.expectEqual(@as(f32, 0), f.z_bounds[0]);
    try std.testing.expectEqual(@as(f32, std.math.floatMax(f32)), f.z_bounds[1]);
}

test "from_rectangle converts the rectangle to a frustum with near=0 and far=MAX" {
    const r = rectangle.create(100, 200, 50, 100);
    const f = from_rectangle(r);

    try std.testing.expectEqual(@as(f32, 100), f.x_bounds[0]);
    try std.testing.expectEqual(@as(f32, 150), f.x_bounds[1]);
    try std.testing.expectEqual(@as(f32, 200), f.y_bounds[0]);
    try std.testing.expectEqual(@as(f32, 300), f.y_bounds[1]);
    try std.testing.expectEqual(@as(f32, 0), f.z_bounds[0]);
    try std.testing.expectEqual(@as(f32, std.math.floatMax(f32)), f.z_bounds[1]);
}

test "from_camera creates a frustum centered on the camera position" {
    const f = from_camera(.{ 0, 0 }, .{ 800, 600 }, 1);

    try std.testing.expectEqual(@as(f32, -400), f.x_bounds[0]);
    try std.testing.expectEqual(@as(f32, 400), f.x_bounds[1]);
    try std.testing.expectEqual(@as(f32, -300), f.y_bounds[0]);
    try std.testing.expectEqual(@as(f32, 300), f.y_bounds[1]);
}

test "from_camera with zoom halves the viewport extent" {
    const f = from_camera(.{ 0, 0 }, .{ 800, 600 }, 2);

    try std.testing.expectEqual(@as(f32, -200), f.x_bounds[0]);
    try std.testing.expectEqual(@as(f32, 200), f.x_bounds[1]);
    try std.testing.expectEqual(@as(f32, -150), f.y_bounds[0]);
    try std.testing.expectEqual(@as(f32, 150), f.y_bounds[1]);
}

test "left_of, right_of, top_of, bottom_of, near_of, far_of return the expected values" {
    const f = create(-10, 10, 20, -20, 0, 100);

    try std.testing.expectEqual(@as(f32, -10), left_of(f));
    try std.testing.expectEqual(@as(f32, 10), right_of(f));
    try std.testing.expectEqual(@as(f32, 20), top_of(f));
    try std.testing.expectEqual(@as(f32, -20), bottom_of(f));
    try std.testing.expectEqual(@as(f32, 0), near_of(f));
    try std.testing.expectEqual(@as(f32, 100), far_of(f));
}

test "width_of returns the difference between right and left" {
    const f = create(-10, 30, 20, -20, 0, 100);

    try std.testing.expectEqual(@as(f32, 40), width_of(f));
}

test "height_of returns the difference between top and bottom" {
    const f = create(-10, 10, 50, -30, 0, 100);

    try std.testing.expectEqual(@as(f32, 80), height_of(f));
}

test "set_bounds returns a new frustum with the given bounds" {
    const f = set_bounds(-5, 5, 10, -10, 1, 50);

    try std.testing.expectEqual(@as(f32, -5), f.x_bounds[0]);
    try std.testing.expectEqual(@as(f32, 5), f.x_bounds[1]);
    try std.testing.expectEqual(@as(f32, -10), f.y_bounds[0]);
    try std.testing.expectEqual(@as(f32, 10), f.y_bounds[1]);
    try std.testing.expectEqual(@as(f32, 1), f.z_bounds[0]);
    try std.testing.expectEqual(@as(f32, 50), f.z_bounds[1]);
}

test "clone returns a frustum equal to the original" {
    const original = create(-10, 10, 20, -20, 0, 100);
    const f = clone(original);

    try std.testing.expectEqual(@as(f32, -10), f.x_bounds[0]);
    try std.testing.expectEqual(@as(f32, 10), f.x_bounds[1]);
    try std.testing.expectEqual(@as(f32, -20), f.y_bounds[0]);
    try std.testing.expectEqual(@as(f32, 20), f.y_bounds[1]);
    try std.testing.expectEqual(@as(f32, 0), f.z_bounds[0]);
    try std.testing.expectEqual(@as(f32, 100), f.z_bounds[1]);
}

test "expand increases the bounds by the margin on all sides" {
    const f = create(-10, 10, 20, -20, 0, 100);
    const e = expand(f, 5);

    try std.testing.expectEqual(@as(f32, -15), e.x_bounds[0]);
    try std.testing.expectEqual(@as(f32, 15), e.x_bounds[1]);
    try std.testing.expectEqual(@as(f32, -25), e.y_bounds[0]);
    try std.testing.expectEqual(@as(f32, 25), e.y_bounds[1]);
    try std.testing.expectEqual(@as(f32, 0), e.z_bounds[0]);
    try std.testing.expectEqual(@as(f32, 100), e.z_bounds[1]);
}

test "expand by zero is the identity" {
    const f = create(-10, 10, 20, -20, 0, 100);
    const e = expand(f, 0);

    try std.testing.expectEqual(f.x_bounds[0], e.x_bounds[0]);
    try std.testing.expectEqual(f.x_bounds[1], e.x_bounds[1]);
    try std.testing.expectEqual(f.y_bounds[0], e.y_bounds[0]);
    try std.testing.expectEqual(f.y_bounds[1], e.y_bounds[1]);
}

test "intersects_rectangle returns true when the rectangle overlaps the frustum" {
    const f = create(-10, 10, 20, -20, 0, 100);
    const r = rectangle.create(-5, -5, 10, 10);

    try std.testing.expect(intersects_rectangle(f, r));
}

test "intersects_rectangle returns false when the rectangle is outside the frustum" {
    const f = create(-10, 10, 20, -20, 0, 100);
    const r = rectangle.create(20, -5, 10, 10);

    try std.testing.expect(!intersects_rectangle(f, r));
}

test "contains_rectangle returns true when the rectangle is fully inside the frustum" {
    const f = create(-10, 10, 20, -20, 0, 100);
    const r = rectangle.create(-5, -5, 5, 5);

    try std.testing.expect(contains_rectangle(f, r));
}

test "contains_rectangle returns false when the rectangle extends outside the frustum" {
    const f = create(-10, 10, 20, -20, 0, 100);
    const r = rectangle.create(-5, -5, 20, 20);

    try std.testing.expect(!contains_rectangle(f, r));
}

test "contains_point returns true for a point inside the frustum" {
    const f = create(-10, 10, 20, -20, 0, 100);

    try std.testing.expect(contains_point(f, 0, 0));
}

test "contains_point returns false for a point outside the frustum" {
    const f = create(-10, 10, 20, -20, 0, 100);

    try std.testing.expect(!contains_point(f, 20, 0));
}

test "cull_rectangle returns false for a visible rectangle" {
    const f = create(-10, 10, 20, -20, 0, 100);
    const r = rectangle.create(-5, -5, 10, 10);

    try std.testing.expect(!cull_rectangle(f, r));
}

test "cull_rectangle returns true for a rectangle outside the frustum" {
    const f = create(-10, 10, 20, -20, 0, 100);
    const r = rectangle.create(20, -5, 10, 10);

    try std.testing.expect(cull_rectangle(f, r));
}

test "is_empty returns false for a valid frustum" {
    const f = create(-10, 10, 20, -20, 0, 100);

    try std.testing.expect(!is_empty(f));
}

test "is_empty returns true when right equals left" {
    const f = create(5, 5, 10, 0, 0, 100);

    try std.testing.expect(is_empty(f));
}

test "is_empty returns true when top equals bottom" {
    const f = create(0, 10, 5, 5, 0, 100);

    try std.testing.expect(is_empty(f));
}

test "equals returns true for identical frustums" {
    const a = create(-10, 10, 20, -20, 0, 100);
    const b = create(-10, 10, 20, -20, 0, 100);

    try std.testing.expect(equals(a, b));
}

test "equals returns false for frustums with different values" {
    const a = create(-10, 10, 20, -20, 0, 100);
    const b = create(-20, 20, 20, -20, 0, 100);

    try std.testing.expect(!equals(a, b));
}

test "area_of returns width times height" {
    const f = create(-10, 10, 30, -20, 0, 100);

    try std.testing.expectEqual(@as(f32, 20 * 50), area_of(f));
}

test "center_of returns the midpoint of the frustum" {
    const f = create(-10, 10, 20, -20, 0, 100);
    const c = center_of(f);

    try std.testing.expectEqual(@as(f32, 0), c[0]);
    try std.testing.expectEqual(@as(f32, 0), c[1]);
}

test "center_of with asymmetric bounds returns the correct midpoint" {
    const f = create(0, 20, 30, 10, 0, 100);
    const c = center_of(f);

    try std.testing.expectEqual(@as(f32, 10), c[0]);
    try std.testing.expectEqual(@as(f32, 20), c[1]);
}

test "translate moves the x and y bounds by the delta" {
    const f = create(-10, 10, 20, -20, 0, 100);
    const t = translate(f, .{ 5, -5 });

    try std.testing.expectEqual(@as(f32, -5), t.x_bounds[0]);
    try std.testing.expectEqual(@as(f32, 15), t.x_bounds[1]);
    try std.testing.expectEqual(@as(f32, -25), t.y_bounds[0]);
    try std.testing.expectEqual(@as(f32, 15), t.y_bounds[1]);
    try std.testing.expectEqual(@as(f32, 0), t.z_bounds[0]);
    try std.testing.expectEqual(@as(f32, 100), t.z_bounds[1]);
}

test "translate with zero vector returns the same frustum" {
    const f = create(-10, 10, 20, -20, 0, 100);
    const t = translate(f, .{ 0, 0 });

    try std.testing.expectEqual(f.x_bounds[0], t.x_bounds[0]);
    try std.testing.expectEqual(f.x_bounds[1], t.x_bounds[1]);
    try std.testing.expectEqual(f.y_bounds[0], t.y_bounds[0]);
    try std.testing.expectEqual(f.y_bounds[1], t.y_bounds[1]);
}

test "intersection_rectangle returns the overlapping region when rectangles intersect" {
    const f = create(0, 10, 10, 0, 0, 100);
    const r = rectangle.create(5, 2, 10, 10);
    const result = intersection_rectangle(f, r);

    try std.testing.expect(result != null);
    try std.testing.expectEqual(@as(f32, 5), result.?.position[0]);
    try std.testing.expectEqual(@as(f32, 2), result.?.position[1]);
    try std.testing.expectEqual(@as(f32, 5), result.?.size[0]);
    try std.testing.expectEqual(@as(f32, 8), result.?.size[1]);
}

test "intersection_rectangle returns null when there is no overlap" {
    const f = create(0, 10, 10, 0, 0, 100);
    const r = rectangle.create(20, 20, 10, 10);

    try std.testing.expect(intersection_rectangle(f, r) == null);
}
