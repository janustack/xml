const std = @import("std");

// [2] Char
// Spec: https://www.w3.org/TR/xml/#NT-Char
pub fn isCharacter(code_point: u21) bool {
    return switch (code_point) {
        '\t', '\n', '\r', ' '...0xD7FF, 0xE000...0xFFFD, 0x10000...0x10FFFF => true,
        else => false,
    };
}

pub fn isDiscouragedCharacter(code_point: u21) bool {
    return switch (code_point) {
        0x7F...0x84, 0x86...0x9F, 0xFDD0...0xFDEF, 0x1FFFE...0x1FFFF, 0x2FFFE...0x2FFFF, 0x3FFFE...0x3FFFF, 0x4FFFE...0x4FFFF, 0x5FFFE...0x5FFFF, 0x6FFFE...0x6FFFF, 0x7FFFE...0x7FFFF, 0x8FFFE...0x8FFFF, 0x9FFFE...0x9FFFF, 0xAFFFE...0xAFFFF, 0xBFFFE...0xBFFFF, 0xCFFFE...0xCFFFF, 0xDFFFE...0xDFFFF, 0xEFFFE...0xEFFFF, 0xFFFFE...0xFFFFF, 0x10FFFE...0x10FFFF => true,
        else => false,
    };
}

// Spec:
pub fn isNameCharacter(code_point: u21) bool {
    return isNameStartCharacter(code_point) or switch (code_point) {
        '-', '.', '0'...'9', 0x00B7, 0x0300...0x036F, 0x203F...0x2040 => true,
        else => false,
    };
}

// Spec:
pub fn isNameStartCharacter(code_point: u21) bool {
    return switch (code_point) {
        ':', '_', 'A'...'Z', 'a'...'z', 0x00C0...0x00D6, 0x00D8...0x00F6, 0x00F8...0x02FF, 0x0370...0x037D, 0x037F...0x1FFF, 0x200C...0x200D, 0x2070...0x218F, 0x2C00...0x2FEF, 0x3001...0xD7FF, 0xF900...0xFDCF, 0xFDF0...0xFFFD, 0x10000...0xEFFFF => true,
        else => false,
    };
}

// Spec: https://www.w3.org/TR/xml/#NT-PubidChar
pub fn isPublicIdentifierCharacter(code_point: u21) bool {
    return switch (code_point) {
        ' ', '\r', '\n', 'a'...'z', 'A'...'Z', '0'...'9', '-', '\'', '(', ')', '+', ',', '.', '/', ':', '=', '?', ';', '!', '*', '#', '@', '$', '_', '%' => true,
        else => false,
    };
}

// Spec: https://www.w3.org/TR/xml/#sec-CharData
pub fn isQuote(code_point: u21) bool {
    return switch (code_point) {
        '\'', '"' => true,
        else => false,
    };
}

// [3] S
// Spec: https://www.w3.org/TR/xml/#NT-S
pub fn isWhitespace(code_point: u21) bool {
    return switch (code_point) {
        '\r', '\t', '\n', ' ' => true,
        else => false,
    };
}

test "isNameCharacter" {
    try std.testing.expect(isNameCharacter('A'));
    try std.testing.expect(isNameCharacter('-'));
    try std.testing.expect(isNameCharacter('.'));
    try std.testing.expect(isNameCharacter('9'));
    try std.testing.expect(isNameCharacter(0xB7));
    try std.testing.expect(!isNameCharacter(' '));
    try std.testing.expect(!isNameCharacter(0x0));
}

test "isNameStartCharacter" {
    try std.testing.expect(isNameStartCharacter(':'));
    try std.testing.expect(isNameStartCharacter('_'));
    try std.testing.expect(isNameStartCharacter('A'));
    try std.testing.expect(isNameStartCharacter('z'));
    try std.testing.expect(isNameStartCharacter(0xC0));
    try std.testing.expect(!isNameStartCharacter('0'));
    try std.testing.expect(!isNameStartCharacter('-'));
    try std.testing.expect(!isNameStartCharacter(0x37E)); // Greek question mark, excluded
}

test "isWhitespace" {
    try std.testing.expect(isWhitespace(' '));
    try std.testing.expect(isWhitespace('\t'));
    try std.testing.expect(isWhitespace('\r'));
    try std.testing.expect(isWhitespace('\n'));
    try std.testing.expect(!isWhitespace('a'));
    try std.testing.expect(!isWhitespace(0x0));
}
