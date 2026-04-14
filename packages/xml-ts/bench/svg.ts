import { type SAXOptions, SAXParser } from "@janustack/sax";
import { bench, group, run } from "mitata";
import IsaacsSAX from "sax";

const janustackOptions: SAXOptions = {
	namespaces: true,
	trackPosition: false,
} as const;

const isaacsOptions = {
	normalize: false,
	position: false,
	strict: false,
	trim: false,
	xmlns: true,
} as const;

const decoder = new TextDecoder();

const path = "../assets/svg/index.svg";
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
		const parser = IsaacsSAX.parser(isaacsOptions.strict, isaacsOptions);
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
		const parser = IsaacsSAX.parser(isaacsOptions.strict, isaacsOptions);
		parser.write(text);
		parser.close();
	});
});

await run();
