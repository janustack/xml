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
const stream = Bun.file(url).stream();

const chunks: string[] = [];

for await (const chunk of stream) {
	chunks.push(decoder.decode(chunk, { stream: true }));
}

group("XML Parser Comparison (chunked strings)", () => {
	bench("Janustack SAX", () => {
		const parser = new SAXParser(janustackOptions);
		for (const chunk of chunks) {
			parser.write(chunk);
		}
		parser.end();
	});

	bench("Isaacs SAX", () => {
		const parser = IsaacsSAX.parser(isaacsOptions.strict, isaacsOptions);
		for (const chunk of chunks) {
			parser.write(chunk);
		}
		parser.close();
	});
});

run();
