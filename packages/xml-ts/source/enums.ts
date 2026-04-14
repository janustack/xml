export enum AttributeValueSyntax {
	/**
	 * Attribute value wrapped in double quotes.
	 *
	 * @example
	 * <input value="hello" />
	 */
	DoubleQuoted,

	/**
	 * JSX-style attribute expression.
	 *
	 * @example
	 * <Component prop={someExpression} />
	 */
	JsxExpression,

	/**
	 * Attribute without an explicit value (boolean attribute).
	 *
	 * @example
	 * <input disabled />
	 */
	Boolean,

	/**
	 * Attribute value wrapped in single quotes.
	 *
	 * @example
	 * <input value='hello' />
	 */
	SingleQuoted,

	/**
	 * Attribute value without quotes.
	 *
	 * @example
	 * <input value=hello />
	 */
	Unquoted,
}

export enum ParseError {
	BooleanAttributeInXml = "XML does not allow boolean attributes",
}

export enum Mode {
	Auto,
	Html,
	Jsx,
	Xml,
}

export enum State {
	Attribute,
	AttributeName,
	AttributeNameSawWhitespace,
	AttributeValue,
	AttributeValueClosed,
	AttributeValueEntityQuoted,
	AttributeValueEntityUnquoted,
	AttributeValueQuoted,
	AttributeValueUnquoted,

	Begin,
	BeginWhitespace,

	CData,
	CDataEnding,
	CDataEnding2,

	CloseTag,
	CloseTagSawWhitespace,

	Comment,

	Doctype,
	DoctypeDtd,
	DoctypeDtdQuoted,
	DoctypeQuoted,

	JsxAttributeExpression,
	JsxExpressionChild,

	OpenTag,
	OpenTagSlash,
	OpenWaka,

	MarkupDeclaration,
	MarkupDeclarationQuoted,

	ProcessingInstruction,
	ProcessingInstructionData,
	ProcessingInstructionEnding,

	Script,

	Text,
	TextEntity,
}
