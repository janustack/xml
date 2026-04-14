import { Ascii } from "./ascii.js";
import { isWhitespace } from "./character.js";
import type { QualifiedName } from "./types.js";

export function isAttributeEnd(charCode: number): boolean {
	return charCode === Ascii.CloseAngle || isWhitespace(charCode);
}

export function parseQualifiedName(
	name: string,
	attribute?: boolean,
): QualifiedName {
	let prefix: string | undefined;
	let localName = name;

	const index = name.indexOf(":");

	if (index >= 0) {
		prefix = name.slice(0, index);
		localName = name.slice(index + 1);
	}

	// <x "xmlns"="http://foo">
	if (attribute && name === "xmlns") {
		prefix = "xmlns";
		localName = "";
	}

	return { prefix, localName };
}
