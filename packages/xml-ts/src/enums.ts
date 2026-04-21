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
