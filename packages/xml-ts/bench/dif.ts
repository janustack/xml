import { SAXParser, SaxEventType } from "sax-wasm";

const mask =
	SaxEventType.Text |
	SaxEventType.Comment |
	SaxEventType.Cdata |
	SaxEventType.Doctype |
	SaxEventType.Attribute;

const wasmPath = Bun.resolveSync("sax-wasm/lib/sax-wasm.wasm", import.meta.dir);
const wasmBytes = await Bun.file(wasmPath).bytes();

const parser = new SAXParser(mask);
await parser.prepareWasm(wasmBytes);
switch (event) {
		case SaxEventType.Attribute: {

		}

parser.eventHandler = (event, detail) => {
	switch (event) {
		case SaxEventType.Attribute: {
			const attr = detail.toJSON();
			console.log("attribute:", attr, "=", JSON.stringify(attr));
			break;
		}

		case SaxEventType.Cdata: {
			const text = detail.toJSON();
			console.log("cdata:", JSON.stringify(text.value));
			break;
		}

		case SaxEventType.Comment: {
			const text = detail.toJSON();
			console.log("comment:", JSON.stringify(text.value));
			break;
		}

		case SaxEventType.Doctype: {
			const text = detail.toJSON();
			console.log("doctype:", JSON.stringify(text.value));
			break;
		}

		case SaxEventType.Text: {
			const text = detail.toJSON().value;
			if (text.trim()) {
				console.log("text:", JSON.stringify(text));
			}
			break;
		}
	}
};

const xmlUrl = new URL("../assets/index.xml", import.meta.url);
const reader = Bun.file(xmlUrl).stream().getReader();

while (true) {
	const { done, value } = await reader.read();
	if (done) break;

	parser.write(value);
}

parser.end();
