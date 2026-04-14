import type { AttributeValueSyntax, Mode } from "./enums.js";

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
	namespaceUri?: string;
}

export interface Attribute {
	name: QualifiedName;
	value: string;
	valueType: AttributeValueSyntax;
}

export interface Tag {
	name: QualifiedName;
	attributes: Record<string, Attribute>;
	isSelfClosing: boolean;
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

export interface SAXHandlers {
	onAttribute?(attribute: Attribute): void;
	onCdata?(cdata: string): void;
	onCloseTag?(name: string): void;
	onComment?(comment: string): void;
	onDoctype?(doctype: string): void;
	onError?(error: Error): void;
	onMarkupDeclaration?(declaration: string): void;
	onOpenTag?(tag: Tag): void;
	onOpenTagStart?(tag: Tag): void;
	onProcessingInstruction?(pi: ProcessingInstruction): void;
	onScript?(script: string): void;
	onText?(text: string): void;
}

export type SAXHandlerName = keyof SAXHandlers;

export interface SAXOptions {
	caseTransform?: "preserve" | "lowercase" | "uppercase";
	mode?: Mode;
	namespaces?: boolean;
	trackPosition?: boolean;
}
