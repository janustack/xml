const std = @import("std");
const xast = @import("xast.zig");
const QualifiedName = xast.QualifiedName;

pub const Parser =  struct {
    allocator: std.mem.Allocator,

    pub fn init(allocator: std.mem.Allocator) Parser {
        return .{
            .allocator = allocator,
        };
    }

    pub fn deinit(this: *@This()) void {

    }

    // Spec:
    fn parseParameterEntityDefinition(this: *@This()) ParseError! {

    }

    // Spec: https://www.w3.org/TR/xml/#NT-CharRef
    fn parseCharacterReference(this: *@This())  ParseError! {

    }

    // Spec: https://www.w3.org/TR/xml/#NT-EntityRef
    fn parseEntityReference(this: *@This()) ParseError! {

    }

    // Spec:
    fn  parseGeneralEntityDeclaration(this: *@This()) ParseError! {

    }

    // Spec:
    fn parseEntityDeclaration(this: *@This()) ParseError! {

    }

    // Spec:
    fn parseParameterEntityDeclaration(this:  *@This()) ParseError!  {

    }

    // Spec:
    fn parseEntityDefinition(this: *@This()) ParseError! {

    }

    // Spec:
    fn parseName(this: *@This()) ParseError! {

    }

    // Spec:
    fn parsePublicIdentifierLiteral(this: *@This()) ParseError! {

    }

    // Spec:
    fn parseReference(this: *@This()) ParseError!Reference  {

    }

    fn parseSystemLiteral() {

    }
};



test "splitQualifiedName" {
    {
        const qname = splitQualifiedName("svg:path");
        try std.testing.expect(qname.prefix != null);
        try std.testing.expectEqualStrings("svg", qname.prefix.?);
        try std.testing.expectEqualStrings("path", qname.local_name);
    }

    {
        const qname = splitQualifiedName("path");
        try std.testing.expect(qname.prefix == null);
        try std.testing.expectEqualStrings("path", qname.local_name);
    }

    {
        const qname = splitQualifiedName(":path");
        try std.testing.expect(qname.prefix != null);
        try std.testing.expectEqualStrings("", qname.prefix.?);
        try std.testing.expectEqualStrings("path", qname.local_name);
    }

    {
        const qname = splitQualifiedName("svg:");
        try std.testing.expect(qname.prefix != null);
        try std.testing.expectEqualStrings("svg", qname.prefix.?);
        try std.testing.expectEqualStrings("", qname.local_name);
    }

    {
        const qname = splitQualifiedName("a:b:c");
        try std.testing.expect(qname.prefix != null);
        try std.testing.expectEqualStrings("a", qname.prefix.?);
        try std.testing.expectEqualStrings("b:c", qname.local_name);
    }
}
