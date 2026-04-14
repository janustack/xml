import { describe, expect, test } from "bun:test";
import type { SAXOptions } from "@janustack/sax";

describe("self closing", () => {
	test("self-closing-child-strict", () => {
		const options: SAXOptions = { strict: true };

		const xml = `
<root>
  <child>
    <haha />
  </child>
  <monkey>=(|)</monkey>
</root>
`.trim();

		const expected = [
			["openTagStart", { name: "root", attributes: {} }],
			["openTag", { name: "root", attributes: {}, isSelfClosing: false }],
			["openTagStart", { name: "child", attributes: {} }],
			["openTag", { name: "child", attributes: {}, isSelfClosing: false }],
			["openTagStart", { name: "haha", attributes: {} }],
			["openTag", { name: "haha", attributes: {}, isSelfClosing: true }],
			["closeTag", "haha"],
			["closeTag", "child"],
			["openTagStart", { name: "monkey", attributes: {} }],
			["openTag", { name: "monkey", attributes: {}, isSelfClosing: false }],
			["text", "=(|)"],
			["closeTag", "monkey"],
			["closeTag", "root"],
			["end"],
			["ready"],
		];
	});
	test("self-closing-child.test", () => {
		const options: SAXOptions = { strict: false };

		const xml = `
		    <root>
						<child>
						  <haha />
						</child>
						<monkey>=(|)</monkey>
				</root>
				`.trim();

		const expected = [
			["openTagStart", { name: "ROOT", attributes: {} }],
			["openTag", { name: "ROOT", attributes: {}, isSelfClosing: false }],
			["openTagStart", { name: "CHILD", attributes: {} }],
			["openTag", { name: "CHILD", attributes: {}, isSelfClosing: false }],
			["openTagStart", { name: "HAHA", attributes: {} }],
			["openTag", { name: "HAHA", attributes: {}, isSelfClosing: true }],
			["closeTag", "HAHA"],
			["closeTag", "CHILD"],
			["openTagStart", { name: "MONKEY", attributes: {} }],
			["openTag", { name: "MONKEY", attributes: {}, isSelfClosing: false }],
			["text", "=(|)"],
			["closeTag", "MONKEY"],
			["closeTag", "ROOT"],
			["end"],
			["ready"],
		];
	});

	test("self-closing-tag.test", () => {
		const options: SAXOptions = { trim: true };

		const xml = `
            <root>
               <haha />
               <haha/>
               <monkey>
                 =(|)
               </monkey>
            </root>
            `.trim();

		const expected = [
			["openTagStart", { name: "ROOT", attributes: {} }],
			["openTag", { name: "ROOT", attributes: {}, isSelfClosing: false }],
			["openTagStart", { name: "HAHA", attributes: {} }],
			["openTag", { name: "HAHA", attributes: {}, isSelfClosing: true }],
			["closeTag", "HAHA"],
			["openTagStart", { name: "HAHA", attributes: {} }],
			["openTag", { name: "HAHA", attributes: {}, isSelfClosing: true }],
			["closeTag", "HAHA"],
			// ["openTag", {name:"HAHA", attributes:{}}],
			// ["closeTag", "HAHA"],
			["openTagStart", { name: "MONKEY", attributes: {} }],
			["openTag", { name: "MONKEY", attributes: {}, isSelfClosing: false }],
			["text", "=(|)"],
			["closeTag", "MONKEY"],
			["closeTag", "ROOT"],
		];
	});
});
