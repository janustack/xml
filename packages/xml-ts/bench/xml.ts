import { type SAXOptions, SAXParser } from "@janustack/xml";
import { bench, group, run } from "mitata";
import IsaacsSAX from "sax";

const janustackOptions: SAXOptions = {
	namespaces: true,
} as const;

const isaacsOptions = {
	xmlns: true,
} as const;

const decoder = new TextDecoder();

const path = "../assets/xml/1mb.xml";
const url = new URL(path, import.meta.url);
const text = await Bun.file(url).text();

group("XML Parser Comparison (streaming)", () => {
	bench("Janustack SAX", async () => {
		const parser = new SAXParser(janustackOptions);
		const stream = Bun.file(url).stream();
		for await (const chunk of stream) {
			parser.write(chunk);
		}
		parser.end();
	});

	bench("Isaacs SAX", async () => {
		const parser = IsaacsSAX.parser(true, isaacsOptions);
		const stream = Bun.file(url).stream();
		for await (const chunk of stream) {
			parser.write(decoder.decode(chunk, { stream: true }));
		}
		parser.close();
	});
});

group("XML Parser Comparison (text)", () => {
	bench("Janustack SAX", () => {
		const parser = new SAXParser(janustackOptions);
		parser.write(text);
		parser.end();
	});

	bench("Isaacs SAX", () => {
		const parser = IsaacsSAX.parser(true, isaacsOptions);
		parser.write(text);
		parser.close();
	});
});

await run();
