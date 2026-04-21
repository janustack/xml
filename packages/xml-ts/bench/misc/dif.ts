import { SAXParser, SaxEventType } from "sax-wasm";

const wasmPath = Bun.resolveSync("sax-wasm/lib/sax-wasm.wasm", import.meta.dir);
const wasmBytes = await Bun.file(wasmPath).bytes();

const parser = new SAXParser(
	SaxEventType.Attribute |
		SaxEventType.Cdata |
		SaxEventType.CloseTag |
		SaxEventType.Comment |
		SaxEventType.Doctype |
		SaxEventType.OpenTag |
		SaxEventType.ProcessingInstruction |
		SaxEventType.Text,
);
await parser.prepareWasm(wasmBytes);

const xmlUrl = new URL("../../assets/xml/test.xml", import.meta.url);
const reader = Bun.file(xmlUrl).stream().getReader();

for await (const [event, detail] of parser.parse(reader)) {
	switch (event) {
		case SaxEventType.Attribute: {
			const attribute = detail.toJSON();
			console.log("attribute:", JSON.stringify(attribute, null, 2));
			break;
		}

		case SaxEventType.Cdata: {
			const cdata = detail.toJSON();
			console.log("cdata:", JSON.stringify(cdata, null, 2));
			break;
		}

		case SaxEventType.CloseTag: {
			const text = detail.toJSON();
			console.log("close tag:", JSON.stringify(text, null, 2));
			break;
		}

		case SaxEventType.Comment: {
			const comment = detail.toJSON();
			console.log("comment:", JSON.stringify(comment, null, 2));
			break;
		}

		case SaxEventType.Doctype: {
			const doctype = detail.toJSON();
			console.log("doctype:", JSON.stringify(doctype, null, 2));
			break;
		}

		case SaxEventType.OpenTag: {
			const text = detail.toJSON();
			console.log("open tag:", JSON.stringify(text, null, 2));
			break;
		}

		case SaxEventType.ProcessingInstruction: {
			const pi = detail.toJSON();
			console.log("processing instruction:", JSON.stringify(pi, null, 2));
			break;
		}

		case SaxEventType.Text: {
			const text = detail.toJSON();
			console.log("text:", JSON.stringify(text));
			break;
		}
	}
}
