import { type SAXOptions, SAXParser } from "@janustack/xml";
import { handlers } from "./shared.ts";

const options: SAXOptions = {
	mode: "xml",
	namespaces: false,
	trackPosition: true,
} as const;

const path = "../../assets/xml/test.xml";
const url = new URL(path, import.meta.url);
const text = await Bun.file(url).text();

const parser = new SAXParser(options, handlers);
parser.write(text);
parser.end();
