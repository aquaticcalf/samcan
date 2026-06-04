const std = @import("std");

pub fn build(b: *std.Build) void {
    const math_mod = b.addModule("math", .{
        .root_source_file = b.path("math/index.zig"),
    });
    _ = math_mod;

    const exe = b.addExecutable(.{
        .name = "samcan",
        .root_module = b.createModule(.{
            .root_source_file = b.path("app/main.zig"),
            .target = b.standardTargetOptions(.{}),
            .optimize = b.standardOptimizeOption(.{}),
        }),
    });
    b.installArtifact(exe);

    const run_cmd = b.addRunArtifact(exe);
    run_cmd.step.dependOn(b.getInstallStep());
    if (b.args) |args| run_cmd.addArgs(args);
    b.step("run", "run the app").dependOn(&run_cmd.step);

    b.step("test", "run tests").dependOn(
        &b.addRunArtifact(b.addTest(.{ .root_module = exe.root_module })).step,
    );
}
