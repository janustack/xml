import {
	SAXParser as JanustackSAXParser,
	type SAXOptions,
} from "@janustack/xml";
import { bench, group, run } from "mitata";
import IsaacsSAX from "sax";
import { SAXParser as ModifiedSAXParser } from "../../tests/modded-sax/dist/main.js";

const janustackOptions: SAXOptions = {
	mode: "xml",
	namespaces: true,
} as const;

const isaacsOptions = {
	xmlns: true,
} as const;

const decoder = new TextDecoder();

const path = "../../assets/xml/3mb.xml";
const url = new URL(path, import.meta.url);
const stream = Bun.file(url).stream();

const chunks: string[] = [];

for await (const chunk of stream) {
	chunks.push(decoder.decode(chunk, { stream: true }));
}

group("XML Parser Comparison (chunked strings)", () => {
	bench("Janustack SAX", () => {
		const parser = new JanustackSAXParser(janustackOptions);
		for (const chunk of chunks) {
			parser.write(chunk);
		}
		parser.end();
	});

	bench("Modified Isaacs SAX", () => {
		const parser = new ModifiedSAXParser(true, isaacsOptions);
		for (const chunk of chunks) {
			parser.write(chunk);
		}
		parser.close();
	});

	bench("Isaacs SAX", () => {
		const parser = IsaacsSAX.parser(true, isaacsOptions);
		for (const chunk of chunks) {
			parser.write(chunk);
		}
		parser.close();
	});
});

await run();
