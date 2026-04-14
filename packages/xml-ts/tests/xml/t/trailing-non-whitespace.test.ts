import { describe, expect, test } from "bun:test";
import { type SAXOptions } from "@janustack/sax";

describe("", () => {
	test("", () => {
		const options: SAXOptions = { strict: false };
		const xml = "<span>Welcome,</span> to monkey land";
		const expected = [
			[
				"openTagStart",
				{
					name: "SPAN",
					attributes: {},
				},
			],
			[
				"opentag",
				{
					name: "SPAN",
					attributes: {},
					isSelfClosing: false,
				},
			],
			["text", "Welcome,"],
			["closeTag", "SPAN"],
			["text", " to monkey land"],
			["end"],
			["ready"],
		];
	});
});
