import { Ascii } from "./ascii.js";

export function isChar(codePoint: number): boolean {
	return (
		codePoint === Ascii.HorizontalTab ||
		codePoint === Ascii.LineFeed ||
		codePoint === Ascii.CarriageReturn ||
		(codePoint >= Ascii.Space && codePoint <= 0xd7ff) ||
		(codePoint >= 0xe000 && codePoint <= 0xfffd) ||
		(codePoint >= 0x10000 && codePoint <= 0x10ffff)
	);
}

/**
 * Checks whether an entire string is one valid XML 'Name'.
 */
export function isName(str: string): boolean {
	if (str.length === 0) {
		return false;
	}

	// Convert string to an array of characters to properly handle Unicode surrogate pairs.
	// e.g., Characters in the #x10000-#xEFFFF range take up two 16-bit code units.
	const chars = Array.from(str);

	// The first character must strictly be a NameStartChar
	const firstCodePoint = chars[0].codePointAt(0);

	if (firstCodePoint === undefined || !isNameStartChar(firstCodePoint)) {
		return false;
	}

	// All subsequent characters must be NameChars
	for (let i = 1; i < chars.length; i++) {
		const codePoint = chars[i].codePointAt(0);

		if (codePoint === undefined || !isNameChar(codePoint)) {
			return false;
		}
	}

	return true;
}

/**
 * Checks whether an entire string is a valid space-separated list of XML 'Name' values.
 */
export function isNames(str: string): boolean {
	if (str.length === 0) {
		return false;
	}

	// The specification strictly requires space (#x20) as the delimiter,
	// not general whitespace (S).
	const namesList = str.split(" ");

	for (const name of namesList) {
		if (!isName(name)) {
			return false;
		}
	}

	return true;
}

export function isNameChar(codePoint: number): boolean {
	return (
		isNameStartChar(codePoint) ||
		(codePoint >= Ascii.Zero && codePoint <= Ascii.Nine) || // 0-9
		codePoint === Ascii.Minus || // -
		codePoint === Ascii.Period || // .
		codePoint === 0x00b7 ||
		(codePoint >= 0x0300 && codePoint <= 0x036f) ||
		(codePoint >= 0x203f && codePoint <= 0x2040)
	);
}

export function isNameStartChar(codePoint: number): boolean {
	return (
		(codePoint >= Ascii.UppercaseA && codePoint <= Ascii.UppercaseZ) || // A-Z
		(codePoint >= Ascii.LowercaseA && codePoint <= Ascii.LowercaseZ) || // a-z
		codePoint === Ascii.Colon || // :
		codePoint === Ascii.Underscore || // _
		(codePoint >= 0x00c0 && codePoint <= 0x00d6) ||
		(codePoint >= 0x00d8 && codePoint <= 0x00f6) ||
		(codePoint >= 0x00f8 && codePoint <= 0x02ff) ||
		(codePoint >= 0x0370 && codePoint <= 0x037d) ||
		(codePoint >= 0x037f && codePoint <= 0x1fff) ||
		(codePoint >= 0x200c && codePoint <= 0x200d) ||
		(codePoint >= 0x2070 && codePoint <= 0x218f) ||
		(codePoint >= 0x2c00 && codePoint <= 0x2fef) ||
		(codePoint >= 0x3001 && codePoint <= 0xd7ff) ||
		(codePoint >= 0xf900 && codePoint <= 0xfdcf) ||
		(codePoint >= 0xfdf0 && codePoint <= 0xfffd) ||
		(codePoint >= 0x10000 && codePoint <= 0xeffff)
	);
}

export type Quote = typeof Ascii.DoubleQuote | typeof Ascii.SingleQuote;

export function isQuote(codePoint: number): codePoint is Quote {
	return codePoint === Ascii.DoubleQuote || codePoint === Ascii.SingleQuote;
}

export function isRestrictedChar(codePoint: number): boolean {
	return (
		(codePoint >= Ascii.StartOfHeader && codePoint <= Ascii.Backspace) ||
		(codePoint >= Ascii.VerticalTab && codePoint <= Ascii.FormFeed) ||
		(codePoint >= Ascii.ShiftOut && codePoint <= Ascii.UnitSeparator) ||
		(codePoint >= Ascii.Delete && codePoint <= 0x84) ||
		(codePoint >= 0x86 && codePoint <= 0x9f)
	);
}

export function isWhitespace(codePoint: number): boolean {
	return (
		codePoint === Ascii.CarriageReturn ||
		codePoint === Ascii.HorizontalTab ||
		codePoint === Ascii.LineFeed ||
		codePoint === Ascii.Space
	);
}
