const std = @import("std");
const ParseError = @import("./error.zig");

pub const Parser = struct {
    allocator: std.mem.Allocator,
    options: Options,
    state: State = .begin,

    pub fn init(allocator: std.mem.Allocator, options: Options) Parser {
        return .{
            .allocator = allocator,
            .options = options,
        };
    }

    pub fn deinit(this: *@This()) void {}
};
