// stray ending tags should just be ignored in non-strict mode.
import { describe, test, expect } from "bun:test";
import { type SAXOptions } from "@janustack/sax";

describe("", () => {
	test("", () => {
		const options: SAXOptions = { strict: false };
		const xml = "<a><b></c></b></a>";
		const expected = [
			[
				"opentagstart",
				{
					name: "A",
					attributes: {},
				},
			],
			[
				"opentag",
				{
					name: "A",
					attributes: {},
					isSelfClosing: false,
				},
			],
			[
				"opentagstart",
				{
					name: "B",
					attributes: {},
				},
			],
			[
				"opentag",
				{
					name: "B",
					attributes: {},
					isSelfClosing: false,
				},
			],
			["text", "</c>"],
			["closetag", "B"],
			["closetag", "A"],
		];
	});
});
