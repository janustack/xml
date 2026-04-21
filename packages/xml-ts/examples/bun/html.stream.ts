import { type SAXOptions, SAXParser } from "@janustack/xml";
import { handlers } from "./shared.ts";

const options: SAXOptions = {
	mode: "html",
	namespaces: true,
} as const;

const path = "../../assets/index.html";

const url = new URL(path, import.meta.url);
const stream = Bun.file(url).stream();

const parser = new SAXParser(options, handlers);

for await (const chunk of stream) {
	parser.write(chunk);
}

parser.end();
