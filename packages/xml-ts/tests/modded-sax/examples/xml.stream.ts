import { SAXParser } from "modded-sax";

const options = {
	strict: true,
	xmlns: true,
} as const;

const parser = new SAXParser(options.strict, options);

parser.onAttribute = (attribute) => {
	console.log("Attribute:", attribute);
};

parser.onCdata = (cdata) => {
	console.log("Cdata:", cdata);
};

parser.onCloseTtag = (name) => {
	console.log("Close Tag:", name);
};

parser.onComment = (comment) => {
	console.log("Comment:", comment);
};

parser.onError = (error) => {
	console.error("Error:", error);
};

parser.onOpenTag = (tag) => {
	console.log("Open Tag:", tag);
};

parser.onProcessingInstruction = (pi) => {
	console.log("Processing Instruction:", pi);
};

parser.onText = (text) => {
	const normalized = text.replace(/\s+/g, " ").trim();

	if (normalized) {
		console.log("Text:", text);
	}
};

const decoder = new TextDecoder();

const path = "../../../assets/xml/test.xml";
const url = new URL(path, import.meta.url);
const stream = Bun.file(url).stream();

for await (const chunk of stream) {
	parser.write(decoder.decode(chunk, { stream: true }));
}

parser.close();
