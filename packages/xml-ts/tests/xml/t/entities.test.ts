import { describe, expect, test } from "bun:test";
import type { SAXOptions } from "@janustack/sax";

test("", () => {
	const options: SAXOptions = { strictEntities: true };
	const xml =
		"<r>&rfloor; " +
		"&spades; &copy; &rarr; &amp; " +
		"&lt; < <  <   < &gt; &real; &weierp; &euro;</r>";
	const expected = [
		["openTagStart", { name: "R", attributes: {} }],
		["openTag", { name: "R", attributes: {}, isSelfClosing: false }],
		[
			"text",
			"&rfloor; &spades; &copy; &rarr; & < < <  <   < > &real; &weierp; &euro;",
		],
		["closeTag", "R"],
	];
});

test("unparsed-entities-predefind-in-custom.test", () => {
	const options: SAXOptions = { unparsedEntities: true };
	const entity_reference = "<text>entity reference</text>";
	const escaped_entity_reference =
		"&lt;text&gt;escaped entity reference&lt;/text&gt;";
	const xml = `
   <svg>
     <text>&lt;text&gt;escaped literal&lt;/text&gt;</text>
     &entity_reference;
     <text>&escaped_entity_reference;</text>
   </svg>
   `;
	const expected = [
		["openTagStart", { name: "SVG", attributes: {} }],
		["openTag", { name: "SVG", attributes: {}, isSelfClosing: false }],
		["openTagStart", { name: "TEXT", attributes: {} }],
		["openTag", { name: "TEXT", attributes: {}, isSelfClosing: false }],
		["text", "<text>escaped literal</text>"],
		["closeTag", "TEXT"],
		["openTagStart", { name: "TEXT", attributes: {} }],
		["openTag", { name: "TEXT", attributes: {}, isSelfClosing: false }],
		["text", "entity reference"],
		["closeTag", "TEXT"],
		["openTagStart", { name: "TEXT", attributes: {} }],
		["openTag", { name: "TEXT", attributes: {}, isSelfClosing: false }],
		["text", "<text>escaped entity reference</text>"],
		["closeTag", "TEXT"],
		["closeTag", "SVG"],
	];
});

test("", () => {
	const options = { unparsedEntities: true };
	const xml = '<doc a="&#34;">' + "</doc>";
	const expected = [
		["openTagStart", { name: "DOC", attributes: {} }],
		["attribute", { name: "A", value: '"' }],
		["openTag", { name: "DOC", attributes: { A: '"' }, isSelfClosing: false }],
		["closeTag", "DOC"],
	];
});
