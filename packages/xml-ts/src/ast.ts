import type { AttributeValueSyntax } from "./enums.js";

export interface ProcessingInstruction {
	/**
	 * The processing instruction target.
	 *
	 * @example
	 * ```xml
	 * <?xml version="1.0"?>
	 *    ^^^
	 * ```
	 */
	target: string;

	/**
	 * The raw instruction data following the target.
	 *
	 * @example
	 * ```xml
	 * <?xml version="1.0" encoding="UTF-8"?>
	 *        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
	 * ```
	 */
	data?: string;
}

export interface NamespaceBinding {
	prefix?: string;
	uri: string;
}

export interface QualifiedName {
	prefix?: string;
	localName: string;
	uri?: string;
}

export interface Attribute {
	name: QualifiedName;
	value: string;
	valueType: AttributeValueSyntax;
}

export interface Tag {
	name: QualifiedName;
	attributes: Record<string, Attribute>;
	selfClosing: boolean;
}

export interface TextNode {
	/**
	 * @example
	 * ```html
	 * <!--`<p>` has the child text node containing "value" -->
	 * <p>value</p>
	 * ```
	 */
	value: string;
	startPosition: number; // Character index in the source where the text node starts
	endPosition: number; // Character index in the source where the text node ends
}
