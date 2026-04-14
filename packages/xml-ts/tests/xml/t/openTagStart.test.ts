import { describe, expect, test } from "bun:test";

const xml = "<root length='12345'></root>";

describe("attribute parsing", () => {
	test.each([
		{
			name: "with xmlns",
			options: { strict: true, xmlns: true },
			expected: [
				[
					"openTagStart",
					{
						name: "root",
						ns: {},
						attributes: {},
					},
				],
				[
					"attribute",
					{
						name: "length",
						value: "12345",
						prefix: "",
						localName: "length",
						uri: "",
					},
				],
				[
					"openTag",
					{
						name: "root",
						prefix: "",
						localName: "root",
						uri: "",
						attributes: {
							length: {
								name: "length",
								value: "12345",
								prefix: "",
								localName: "length",
								uri: "",
							},
						},
						ns: {},
						isSelfClosing: false,
					},
				],
				["closeTag", "root"],
			],
		},
		{
			name: "without xmlns",
			options: { strict: true },
			expected: [
				[
					"openTagStart",
					{
						name: "root",
						attributes: {},
					},
				],
				[
					"attribute",
					{
						name: "length",
						value: "12345",
					},
				],
				[
					"openTag",
					{
						name: "root",
						attributes: {
							length: "12345",
						},
						isSelfClosing: false,
					},
				],
				["closeTag", "root"],
			],
		},
	])("$name", (data) => {});
});
