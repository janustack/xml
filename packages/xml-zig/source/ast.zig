const std = @import("std");

pub const Attribute = struct {
    qualified_name: QualifiedName,
    value: []const u8,

    pub fn write(this: @This(), writer: anytype) !void {
        try this.qualified_name.write(writer);
        try writer.writeAll("=\"");
        try writer.writeByte('"');
    }
};

pub const Cdata = struct {
    data: []const u8,

    pub fn write(this: @This(), writer: anytype) !void {
        try writer.writeAll("<![CDATA[");
        try writer.writeAll(this.data);
        try writer.writeAll("]]>");
    }
};

pub const Comment = struct {
    data: []const u8,

    pub fn write(this: @This(), writer: anytype) !void {
        try writer.writeAll("<!--");
        try writer.writeAll(this.data);
        try writer.writeAll("-->");
    }
};

pub const Doctype = struct {
    name: []const u8,
    public_identifier: ?[]const u8 = null,
    system_identifier: ?[]const u8 = null,

    pub fn hasPublicIdentifier(this: @This()) bool {
        return this.public_identifier != null;
    }

    pub fn hasSystemIdentifier(this: @This()) bool {
        return this.system_identifier != null;
    }

    pub fn write(this: @This(), writer: anytype) !void {
        try writer.writeAll("<!DOCTYPE ");
        try writer.writeAll(this.name);

        if (this.public_identifier) |public_identifier| {
            try writer.print(" PUBLIC \"{s}\"", .{public_identifier});

            if (this.system_identifier) |system_identifier| {
                try writer.print(" \"{s}\"", .{system_identifier});
            }
        } else if (this.system_identifier) |system_identifier| {
            try writer.print(" SYSTEM \"{s}\"", .{system_identifier});
        }

        try writer.writeByte('>');
    }
};

pub const Element = struct {
    qualified_name: QualifiedName,
    attributes: []const Attribute,
    children: []const Node,

    pub fn getAttribute(this: @This(), local_name: []const u8) ?Attribute {
        for (this.attributes) |attribute| {}

        return null;
    }

    pub fn hasAttribute(this: @This(), local_name: []const u8) bool {
        return this.getAttribute(local_name) != null;
    }

    pub fn write(this: @This(), writer: anytype) !void {
        try writer.writeByte('<');
        try this.qualified_name.write(writer);

        for (this.attributes) |attribute| {
            try writer.writeByte(' ');
            try attribute.write(writer);
        }

        if (this.children.len == 0) {
            try writer.writeAll("/>");
        } else {
            try writer.writeByte('>');

            for (this.children) |child| {
                try child.write(writer);
            }
        }

        try writer.writeAll("</");
        try this.qualified_name.write(writer);
        try writer.writeByte('>');
    }
};

pub const NamespaceBinding = struct {
    prefix: ?[]const u8 = null,
    uri: []const u8,

    pub fn hasPrefix(this: @This()) bool {
        return this.prefix != null;
    }

    pub fn isDefault(this: @This()) bool {
        return this.prefix == null;
    }

    pub fn write(this: @This(), writer: anytype) !void {
        try writer.writeAll("xmlns");

        if (this.prefix) |prefix| {
            try writer.writeByte(':');
            try writer.writeAll(prefix);
        } else {
            try writer.print("xmlns=\"{s}\"", .{this.uri});
        }
    }
};

pub const ProcessingInstruction = struct {
    target: []const u8,
    data: ?[]const u8 = null,

    pub fn hasData(this: @This()) bool {
        return this.data != null;
    }

    pub fn write(this: @This(), writer: anytype) !void {
        try writer.writeAll("<?");
        try writer.writeAll(this.target);

        if (this.data) |data| {
            try writer.writeByte(' ');
            try writer.writeAll(data);
        }

        try writer.writeAll("?>");
    }
};

pub const Text = struct {
    data: []const u8,
};

pub const QualifiedName = struct {
    prefix: ?[]const u8 = null,
    local_name: []const u8,

    fn fromSlice(name: []const u8) QualifiedName {
        const prefix, const local_name = if (std.mem.indexOfScalar(u8, name, ':')) |index|
            .{ name[0..index], name[index + 1 ..] }
        else
            .{ null, name };

        return .{
            .prefix = prefix,
            .local_name = local_name,
        };
    }

    pub fn hasPrefix(this: @This()) bool {
        return this.prefix != null;
    }

    pub fn isUnqualified(this: @This()) bool {
        return this.prefix == null;
    }

    pub fn write(this: @This(), writer: anytype) !void {
        if (this.prefix) |prefix| {
            try writer.print("{s}:{s}", .{ prefix, this.local_name });
        } else {
            try writer.writeAll(this.local_name);
        }
    }
};

pub const Node = union(enum) {
    cdata: Cdata,
    comment: Comment,
    doctype: Doctype,
    element: Element,
    processing_instruction: ProcessingInstruction,
    text: Text,

    pub fn write(this: @This(), writer: anytype) !void {
        switch (this) {
            .cdata => |cdata| {
                try cdata.write(writer);
            },
            .comment => |comment| {
                try comment.write(writer);
            },
            .doctype => |doctype| {
                try doctype.write(writer);
            },
            .element => |element| {
                try element.write(writer);
            },
            .processing_instruction => |processing_instruction| {
                try processing_instruction.write(writer);
            },
            .text => |text| {
                try text.write(writer);
            },
        }
    }
};

test "ProcessingInstruction write with data" {
    var buffer: std.ArrayList(u8) = .empty;
    defer buffer.deinit(std.testing.allocator);

    const pi = ProcessingInstruction{
        .target = "xml-stylesheet",
        .data = "type=\"text/xsl\" href=\"style.xsl\"",
    };

    try pi.write(buffer.writer(std.testing.allocator));

    std.debug.print("OUTPUT: {s}\n", .{buffer.items});

    try std.testing.expectEqualStrings(
        "<?xml-stylesheet type=\"text/xsl\" href=\"style.xsl\"?>",
        buffer.items,
    );
}
