import { describe, test } from "bun:test";

describe("BOM", () => {
	test.each([
		{
			name: "BOM at the very begining of the stream should be ignored",
			xml: "\uFEFF<P></P>",
			expect: [
				["openTagStart", { name: "P", attributes: {} }],
				["openTag", { name: "P", attributes: {}, isSelfClosing: false }],
				["closeTag", "P"],
			],
		},
		{
			name: "In all other places it should be consumed",
			xml: '\uFEFF<P BOM="\uFEFF">\uFEFFStarts and ends with BOM\uFEFF</P>',
			expect: [
				["openTagStart", { name: "P", attributes: {} }],
				["attribute", { name: "BOM", value: "\uFEFF" }],
				[
					"openTag",
					{ name: "P", attributes: { BOM: "\uFEFF" }, isSelfClosing: false },
				],
				["text", "\uFEFFStarts and ends with BOM\uFEFF"],
				["closeTag", "P"],
			],
		},
		{
			name: "BOM after a whitespace is an error",
			xml: " \uFEFF<P></P>",
			expect: [
				[
					"error",
					"Non-whitespace before first tag.\nLine: 0\nColumn: 2\nChar: \uFEFF",
				],
				["text", "\uFEFF"],
				["openTagStart", { name: "P", attributes: {} }],
				["openTag", { name: "P", attributes: {}, isSelfClosing: false }],
				["closeTag", "P"],
			],
			options: { strict: true },
		},
		{
			name: "There is only one BOM allowed at the start",
			xml: "\uFEFF\uFEFF<P></P>",
			expect: [
				[
					"error",
					"Non-whitespace before first tag.\nLine: 0\nColumn: 2\nChar: \uFEFF",
				],
				["text", "\uFEFF"],
				["openTagStart", { name: "P", attributes: {} }],
				["openTag", { name: "P", attributes: {}, isSelfClosing: false }],
				["closeTag", "P"],
			],
			options: { strict: true },
		},
	])("$name", (data) => {});
});
