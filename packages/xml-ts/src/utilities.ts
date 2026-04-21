import { Ascii } from "./ascii.js";
import type { QualifiedName } from "./ast.js";
import { isWhitespace } from "./character.js";

export function isAttributeNameEnd(byte: number): boolean {
	return (
		byte === Ascii.Equal || byte === Ascii.CloseAngle || isWhitespace(byte)
	);
}

export function isAttributeValueEnd(byte: number): boolean {
	return byte === Ascii.CloseAngle || isWhitespace(byte);
}

export function isTagNameEnd(byte: number): boolean {
	return (
		byte === Ascii.CloseAngle ||
		byte === Ascii.ForwardSlash ||
		isWhitespace(byte)
	);
}

export function parseQualifiedName(
	name: string,
	attribute?: boolean,
): QualifiedName {
	let prefix = "";
	let localName = name;

	const colonIndex = name.indexOf(":");

	if (colonIndex >= 0) {
		prefix = name.slice(0, colonIndex);
		localName = name.slice(colonIndex + 1);
	}

	// <x "xmlns"="http://foo">
	if (attribute && name === "xmlns") {
		prefix = "xmlns";
		localName = "";
	}

	return { prefix, localName };
}
