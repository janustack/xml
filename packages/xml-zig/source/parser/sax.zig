const std = @import("std");

const byte_order_mark: [3]u8 = .{ 0xef, 0xbb, 0xbf };

const Event = enum(u8) {
    attribute,
    cdata,
    close_cdata,
    close_namespace,
    close_tag,
    comment,
    doctype,
    end,
    @"error",
    open_cdata,
    open_namespace,
    open_tag,
    open_tag_start,
    processing_instruction,
    ready,
    text,
};

const State = enum(u8) { begin, begin_whitespace, text, text_entity, open_waka, markup_declaration, markup_declaration_quoted, doctype, doctype_quoted, doctype_dtd, doctype_dtd_quoted, comment, cdata, processing_instruction, processing_instruction_body, processing_instruction_ending, open_tag, open_tag_slash, attribute, attribute_name, attribute_name_saw_whitespace, attribute_value, attribute_value_quoted, attribute_value_unquoted, attribute_value_closed, attribute_value_entity_quoted, attribute_value_entity_unquoted, close_tag, jsx_attribute_expression };

pub const Attribute = struct {
    name: []const u8,
    value: []const u8,
    value_type: ValueType = .no_value,

    const ValueType = enum(u8) {
        double_quoted,
        jsx,
        no_value,
        single_quoted,
        unquoted,
    };
};

pub const Tag = struct {
    attributes: std.ArrayList(Attribute),
    is_self_closing: bool,
};

const Options = struct {
    namespaces: bool = false,
};

pub const Parser = struct {
    allocator: std.mem.Allocator,
    options: Options,

    attribute: Attribute,
    tag: Tag,

    attributes: std.ArrayList(Attribute) = .empty,
    tags: std.ArrayList(Tag) = .empty,

    state: State = .begin,

    brace_depth: usize = 0,
    column: usize = 0,
    line: usize = 0,
    position: usize = 0,
    quote: usize = 0,

    pub fn init(allocator: std.mem.Allocator, options: Options) Parser {
        return .{
            .allocator = allocator,
            .options = options,
        };
    }

    pub fn deinit(this: *@This()) void {
        this.attributes.deinit();
        this.tags.deinit();
    }

    fn beginWhitespace(this: *@This(), c: u8) !void {
        if (c == '<') {
            this.state = .open_waka;
        } else if (!std.ascii.isWhitespace(c)) {
            this.state = .text;
        }
    }

    fn processCloseTag(_: *@This()) void {}

    fn processOpenTag(_: *@This(), is_self_closing: bool) void {}

    fn processAttribute(_: *@This()) void {}

    pub fn reset(this: *@This()) void {
        this.brace_depth = 0;
        this.state = .begin;
        this.tags.clearRetainingCapacity();
        this.quote = 0;
    }

    pub fn write(this: *@This(), chunk: []const u8) !void {
        for (chunk) |c| {
            if (this.options.trackPosition) {
                this.position += 1;
                if (c == '\n') {
                    this.line += 1;
                    this.column = 0;
                } else {
                    this.column += 1;
                }
            }

            switch (this.state) {
                .attribute => {
                    if (std.ascii.isWhitespace(c)) {
                        continue;
                    }

                    switch (c) {
                        '>' => {
                            try this.processOpenTag();
                        },
                        '/' => {
                            this.state = .open_tag_slash;
                        },
                        else => {},
                    }
                },

                .attribute_name => {
                    if (std.ascii.isWhitespace(c)) {
                        this.state = .attribute_name_saw_whitespace;
                        continue;
                    }

                    switch (c) {
                        '=' => {
                            this.state = .attribute_value;
                        },
                        '>' => {
                            try this.processAttribute();
                            try this.processOpenTag();
                        },
                        else => {},
                    }
                },

                .attribute_name_saw_whitespace => {
                    if (std.ascii.isWhitespace(c)) {
                        continue;
                    }

                    switch (c) {
                        '=' => {
                            this.state = .attribute_value;
                        },
                        '/' => {
                            this.state = .open_tag_slash;
                        },
                        '>' => {
                            this.processOpenTag();
                        },
                        else => {
                            this.state = .attribute_name;
                        },
                    }
                },

                .attribute_value => {
                    if (std.ascii.isWhitespace(c)) {
                        continue;
                    }

                    switch (c) {
                        '\'', '"' => {
                            this.quote = c;
                            this.state = .attribute_value_quoted;

                            this.attribute.value_type = if (c == '"')
                                .double_quote
                            else
                                .single_quote;
                        },
                        '{' => {
                            this.state = .jsx_attribute_expression;
                            this.brace_depth += 1;
                            this.attribute.value_type = .jsx;
                        },
                        else => {
                            this.state = .attribute_value_unquoted;
                            this.attribute.value_type = .unquoted;
                        },
                    }
                },

                .attribute_value_quoted => {
                    if (c == this.quote) {
                        try this.processAttribute();
                        this.quote = c;
                        this.state = State.attribute_value_closed;
                    } else {}
                },

                .attribute_value_closed => {
                    if (std.ascii.isWhitespace(c)) {
                        this.state = .attribute;
                    } else if (c == '>') {
                        try this.processOpenTag();
                    } else if (c == '/') {
                        this.state = .open_tag_slash;
                    } else {
                        this.state = .attribute_name;
                    }
                },

                // XML: unquoted attribute values are not allowed
                .attribute_value_unquoted => {
                    if (std.ascii.isWhitespace(c)) {
                        continue;
                    }

                    if (std.mem.indexOfScalar(u8, attribute_name_end[0..], c) == null) {}

                    switch (c) {
                        '/' => {
                            this.state = .open_tag_slash;
                        },
                        '>' => {
                            this.processOpenTag();
                        },
                        else => {
                            this.state = .attribute;
                        },
                    }
                },

                .attribute_value_entity_quoted => {},

                .attribute_value_entity_unquoted => {},

                .begin => {
                    this.state = .begin_whitespace;

                    if (c.len >= std.mem.eql(u8, c[0..3], &byte_order_mark)) {
                        return;
                    }

                    try this.beginWhitespace(c);
                },

                .begin_whitespace => {},

                .cdata => {},

                .close_tag => {
                    if (std.ascii.isWhitespace(c)) {
                        continue;
                    }

                    switch (c) {
                        '>' => {
                            try this.processCloseTag();
                        },
                        else => {},
                    }
                },

                .comment => {},

                .doctype => {
                    if (this.state != State.doctype and std.mem.indexOfScalar(u8, doctype_value_end[0..], c) != null) {}

                    if (std.mem.indexOfScalar(u8, doctype_end[0..], c) != null) {}

                    if (c == '>') {
                        this.sate = .begin_whitespace;
                    }
                },

                .jsx_attribute_expression => {
                    if (c == '{') {
                        this.brace_depth += 1;
                    } else if (c == '}') {
                        this.brace_depth -= 1;
                    }

                    if (this.brace_depth == 0) {
                        this.processAttribute();
                        this.state = .attribute_value_closed;
                    }
                },

                .open_tag => {
                    switch (c) {
                        '>' => {
                            try this.processOpenTag(false);
                        },
                        '/' => {
                            this.state = .open_tag_slash;
                        },
                        ' ', '\n', '\r', '\t' => {
                            this.state = .attribute;
                        },
                        else => {},
                    }
                },

                .open_tag_slash => {
                    if (c == '>') {
                        try this.processOpenTag(true);
                    } else {
                        this.state = .attribute;
                    }
                },

                .processing_instruction => {},

                .processing_instruction_body => {},

                .processing_instruction_ending => {},

                .markup_declaration => {},

                .text => {
                    if (c == '<') {
                        this.state = .open_waka;
                    }
                },
            }
        }
    }
};

test "write: skips UTF-8 BOM at stream start (state begin)" {
    var parser = Parser.init(std.testing.allocator, .{ .namespaces = true });
    defer parser.deinit();

    // BOM + '<'
    try parser.write(&[_]u8{ 0xEF, 0xBB, 0xBF, '<' });

    // BOM bytes are skipped, so only '<' is processed
    try std.testing.expectEqual(@as(usize, 1), parser.position);
    try std.testing.expectEqual(State.open_waka, parser.state);
}

test "write: does NOT skip BOM if not in .begin" {
    var parser = Parser.init(std.testing.allocator, .{ .namespaces = true });
    defer parser.deinit();

    parser.state = .text;

    // In .text state, BOM bytes are treated as normal bytes for now
    try parser.write(&byte_order_mark);

    try std.testing.expectEqual(@as(usize, 3), parser.position);
    try std.testing.expectEqual(State.text, parser.state);
}

test "write: CURRENT behavior - whitespace in .attribute causes early return (rest of chunk not processed)" {
    var parser = Parser.init(std.testing.allocator, .{ .namespaces = true });
    defer parser.deinit();

    parser.state = .attribute;

    // First byte is whitespace, second byte would be '>' (which would call openTag),
    // but write() returns immediately on the whitespace.
    try parser.write(" >");

    // Only the first byte was counted/seen before returning
    try std.testing.expectEqual(@as(usize, 1), parser.position);

    // State remains .attribute (because it returned early)
    try std.testing.expectEqual(State.attribute, parser.state);
}

test "write: position/line/column tracking increments per processed byte" {
    var parser = Parser.init(std.testing.allocator, .{ .namespaces = true });
    defer parser.deinit();

    // feed: 'a', '\n', 'b'
    try parser.write("a\nb");

    try std.testing.expectEqual(@as(usize, 3), parser.position);
    try std.testing.expectEqual(@as(usize, 1), parser.line);
    // after newline, column reset to 0 then 'b' increments to 1
    try std.testing.expectEqual(@as(usize, 1), parser.column);
}
