import { describe, test, expect } from "bun:test";

describe("", () => {
	test("", () => {
		const options = { unparsedEntities: true };
		const xml = `<svg><text>&amp;</text></svg>`;
		const expected = [
			["openTagStart", { name: "SVG", attributes: {} }],
			["openTag", { name: "SVG", attributes: {}, isSelfClosing: false }],
			["openTagStart", { name: "TEXT", attributes: {} }],
			["openTag", { name: "TEXT", attributes: {}, isSelfClosing: false }],
			["text", "&"],
			["closeTag", "TEXT"],
			["closeTag", "SVG"],
		];
	});
});
