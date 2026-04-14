export const BUFFERS = [
	"cdata",
	"comment",
	"doctype",
	"entity",
	"markupDeclaration",
	"script",
	"textNode",
] as const;

export const MAX_BUFFER_LENGTH = 64 * 1024;

export const NAMESPACES = {
	xml: "http://www.w3.org/XML/1998/namespace",
	xmlns: "http://www.w3.org/2000/xmlns/",
} as const;

export const XML_PREDEFINED_ENTITIES = {
	amp: "&",
	apos: "'",
	gt: ">",
	lt: "<",
	quot: '"',
} as const;
