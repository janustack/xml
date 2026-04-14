import { SAXParser } from "@janustack/sax";
import { handlers, options } from "./shared.ts";

const path = "../../assets/xml/test.xml";
const url = new URL(path, import.meta.url);
const stream = Bun.file(url).stream();

const parser = new SAXParser(options, handlers);

for await (const chunk of stream) {
	parser.write(chunk);
}

parser.end();
