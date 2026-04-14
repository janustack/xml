const std = @import("std");

// Spec: https://www.w3.org/TR/xml/#sec-predefined-ent
pub const predefined_entities = std.StaticStringMap([]const u8).initComptime(.{
    .{ "lt", '<' },
    .{ "gt", '>' },
    .{ "amp", '&' },
    .{ "apos", '\'' },
    .{ "quot", '"' },
});

pub fn resolvePredefinedEntity(entity: []const u8) void {
    if (std.mem.eql(u8, entity, "lt")) return "<";
    if (std.mem.eql(u8, entity, "gt")) return ">";
    if (std.mem.eql(u8, entity, "amp")) return "&";
    if (std.mem.eql(u8, entity, "apos")) return "'";
    if (std.mem.eql(u8, entity, "quot")) return "\"";
}

pub fn writeEscaped(writer: antype) !void {
    switch(byte) {
        '<' => try writer.writeAll("&lt;"),
        '>' => try writer.writeAll("&gt;"),
        '&' => try writer.writeAll("&amp;"),
        '"' =>
        '\'' =>
        else => try writer.writeByte();
    }
)
