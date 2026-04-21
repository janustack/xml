import {
	SAXParser as JanustackSAXParser,
	type SAXOptions,
} from "@janustack/xml";
import { bench, group, run } from "mitata";
import { SAXParser as ModifiedSAXParser } from "../../tests/modded-sax/dist/main.js";
import SAX from "../../tests/sax/dist/main.js";

const janustackOptions: SAXOptions = {
	namespaces: true,
} as const;

const isaacsOptions = {
	xmlns: true,
} as const;

const decoder = new TextDecoder();

const path = "../../assets/xml/500kb.xml";
const url = new URL(path, import.meta.url);
const text = await Bun.file(url).text();

group("XML Parser Comparison (streaming)", () => {
	bench("Janustack SAX", async () => {
		const parser = new JanustackSAXParser(janustackOptions);
		const stream = Bun.file(url).stream();
		for await (const chunk of stream) {
			parser.write(chunk);
		}
		parser.end();
	});

	bench("Modified Isaacs SAX", async () => {
		const parser = new ModifiedSAXParser(true, isaacsOptions);
		const stream = Bun.file(url).stream();
		for await (const chunk of stream) {
			parser.write(decoder.decode(chunk, { stream: true }));
		}
		parser.close();
	});

	bench("Isaacs SAX", async () => {
		const parser = SAX.parser(true, isaacsOptions);
		const stream = Bun.file(url).stream();
		for await (const chunk of stream) {
			parser.write(decoder.decode(chunk, { stream: true }));
		}
		parser.close();
	});
});

group("XML Parser Comparison (text)", () => {
	bench("Janustack SAX", () => {
		const parser = new JanustackSAXParser(janustackOptions);
		parser.write(text);
		parser.end();
	});

	bench("Modified Isaacs SAX", () => {
		const parser = new ModifiedSAXParser(true, isaacsOptions);
		parser.write(text);
		parser.close();
	});

	bench("Isaacs SAX", () => {
		const parser = SAX.parser(true, isaacsOptions);
		parser.write(text);
		parser.close();
	});
});

await run();
