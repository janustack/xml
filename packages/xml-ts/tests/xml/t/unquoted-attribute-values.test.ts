import { describe, test, expect } from "bun:test";

describe("unquoted attribute values", () => {
	test.each([
		{
			options: { strict: true },
			xml: "<svg width=20px height=20px />",
			expect: [
				["openTagStart", { name: "svg", attributes: {} }],
				["error", "Unquoted attribute value\nLine: 0\nColumn: 12\nChar: 2"],
				["attribute", { name: "width", value: "20px" }],
				["error", "Unquoted attribute value\nLine: 0\nColumn: 24\nChar: 2"],
				["attribute", { name: "height", value: "20px" }],
				[
					"openTag",
					{
						name: "svg",
						attributes: {
							width: "20px",
							height: "20px",
						},
						isSelfClosing: true,
					},
				],
				["closeTag", "svg"],
			],
		},
		{
			options: { strict: false },
			xml: "<svg width=20px height=20px />",
			expect: [
				["openTagStart", { name: "SVG", attributes: {} }],
				["attribute", { name: "WIDTH", value: "20px" }],
				["attribute", { name: "HEIGHT", value: "20px" }],
				[
					"openTag",
					{
						name: "SVG",
						attributes: {
							WIDTH: "20px",
							HEIGHT: "20px",
						},
						isSelfClosing: true,
					},
				],
				["closeTag", "SVG"],
			],
		},
	])("", (data) => {});
});

// strict: true, opt: { unquotedAttributeValues: true }
require(__dirname).test({
	xml: "<svg width=20px height=20px />",
	expect: [
		["openTagStart", { name: "svg", attributes: {} }],
		["attribute", { name: "width", value: "20px" }],
		["attribute", { name: "height", value: "20px" }],
		[
			"openTag",
			{
				name: "svg",
				attributes: {
					width: "20px",
					height: "20px",
				},
				isSelfClosing: true,
			},
		],
		["closeTag", "svg"],
	],
	strict: true,
	opt: {
		unquotedAttributeValues: true,
	},
});

// strict: false, opt: { unquotedAttributeValues: true }
require(__dirname).test({
	xml: "<svg width=20px height=20px />",
	expect: [
		["openTagStart", { name: "SVG", attributes: {} }],
		["attribute", { name: "WIDTH", value: "20px" }],
		["attribute", { name: "HEIGHT", value: "20px" }],
		[
			"openTag",
			{
				name: "SVG",
				attributes: {
					WIDTH: "20px",
					HEIGHT: "20px",
				},
				isSelfClosing: true,
			},
		],
		["closeTag", "SVG"],
	],
	strict: false,
	opt: {
		unquotedAttributeValues: true,
	},
});
