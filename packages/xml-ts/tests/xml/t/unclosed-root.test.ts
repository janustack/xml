import { describe, test, expect } from "bun:test";
import { type SAXOptions } from "@janustack/sax";

describe("", () => {
	test("", () => {
		const options: SAXOptions = { strict: true };
		const xml = "<root>";
		const expected = [
			[
				"opentagstart",
				{
					name: "root",
					attributes: {},
				},
			],
			[
				"opentag",
				{
					name: "root",
					attributes: {},
					isSelfClosing: false,
				},
			],
			["error", "Unclosed root tag\nLine: 0\nColumn: 6\nChar: "],
		];
	});
});
