const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    const math_mod = b.addModule("math", .{
        .root_source_file = b.path("math/index.zig"),
        .target = target,
        .optimize = optimize,
    });
    _ = math_mod;

    const exe = b.addExecutable(.{
        .name = "samcan",
        .root_module = b.createModule(.{
            .root_source_file = b.path("app/main.zig"),
            .target = target,
            .optimize = optimize,
        }),
    });
    b.installArtifact(exe);

    const run_cmd = b.addRunArtifact(exe);
    run_cmd.step.dependOn(b.getInstallStep());
    if (b.args) |args| run_cmd.addArgs(args);
    b.step("run", "run the app").dependOn(&run_cmd.step);

    const test_step = b.step("test", "run tests");
    test_step.dependOn(&b.addRunArtifact(b.addTest(.{ .root_module = exe.root_module })).step);
    const math_test = b.addModule("math_test", .{
        .root_source_file = b.path("math/test.zig"),
        .target = target,
        .optimize = optimize,
    });
    test_step.dependOn(&b.addRunArtifact(b.addTest(.{ .root_module = math_test })).step);
}
