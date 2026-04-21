import type { SAXHandlers, SAXOptions } from "@janustack/xml";

export const options: SAXOptions = {
	namespaces: true,
} as const;

export const handlers: SAXHandlers = {
	onAttribute(attribute) {
		Bun.stdout.write(
			`Attribute: ${Bun.inspect(attribute, { colors: true })}\n`,
		);
	},
	onCdata(cdata) {
		Bun.stdout.write(`Cdata: ${cdata}\n`);
	},
	onCloseTag(tag) {
		Bun.stdout.write(`Close Tag: ${Bun.inspect(tag, { colors: true })}\n`);
	},
	onComment(comment) {
		Bun.stdout.write(`Comment: ${Bun.inspect(comment, { colors: true })}\n`);
	},
	onDoctype(doctype) {
		Bun.stdout.write(`Doctype: ${doctype}\n`);
	},
	onError(error) {
		Bun.stderr.write(`Error: ${error.message}\n`);
	},
	onOpenTag(tag) {
		Bun.stdout.write(`Open Tag: ${Bun.inspect(tag, { colors: true })}\n`);
	},
	onProcessingInstruction(pi) {
		Bun.stdout.write(
			`Processing Instruction: ${Bun.inspect(pi, { colors: true })}\n`,
		);
	},
	onText(text) {
		Bun.stdout.write(`Text: ${Bun.inspect(text, { colors: true })}\n`);
	},
};
