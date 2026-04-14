import { describe, expect, test } from "bun:test";

describe("comments", () => {
	test.each([
		{
			name: "markup",
			source: "<!-- stand alone comment -->",
			expect: [["comment", " stand alone comment "]],
			options: { strict: true },
		},
		{
			name: "jsx",
			source: "<!-- stand alone comment -->",
			expect: [["comment", " stand alone comment "]],
			options: { strict: true },
		},
	])("$name", (data) => {});
});
