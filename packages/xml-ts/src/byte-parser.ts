import { Ascii } from "./ascii";
import type {
	Attribute,
	NamespaceBinding,
	ProcessingInstruction,
	Tag,
	TextNode,
} from "./ast";
import {
	isNameCharacter,
	isNameStartCharacter,
	isQuote,
	isWhitespace,
} from "./character.js";
import {
	XML_PREDEFINED_ENTITIES,
	XML_PREDEFINED_NAMESPACES,
} from "./constants.js";
import { AttributeValueSyntax } from "./enums.ts";
import { isAttributeValueEnd, parseQualifiedName } from "./utilities.js";

export interface SAXHandlers {
	onAttribute?(attribute: Attribute): void;
	onCdata?(cdata: string): void;
	onCloseTag?(name: string): void;
	onComment?(comment: { value: string }): void;
	onDoctype?(doctype: string): void;
	onError?(error: Error): void;
	onMarkupDeclaration?(declaration: string): void;
	onOpenTag?(tag: Tag): void;
	onOpenTagStart?(tag: Tag): void;
	onProcessingInstruction?(pi: ProcessingInstruction): void;
	onScript?(script: string): void;
	onText?(text: TextNode): void;
}

export interface SAXOptions {
	caseTransform?: "preserve" | "lowercase" | "uppercase";
	mode?: "html" | "jsx" | "xml";
	namespaces?: boolean;
	trackPosition?: boolean;
}

const MAX_BUFFER_LENGTH = 64 * 1024;

const PARSE_ERROR = {
	BooleanAttributeInXml: "XML does not allow boolean attributes",
} as const;

enum State {
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

export class SAXParser {
	public decoder = new TextDecoder();

	public static defaultOptions: SAXOptions = {
		caseTransform: "preserve",
		mode: "xml",
		namespaces: false,
		trackPosition: false,
	};

	public error: Error | null = null;
	public handlers: SAXHandlers;
	public options: SAXOptions;

	// List implemented as an array of Attribute objects
	private attributeList: Attribute[] = [];
	private namespaceStack: NamespaceBinding[] = [
		Object.create(XML_PREDEFINED_NAMESPACES),
	];
	// Stack implemented as an array of Tag objects
	private tagStack: Tag[] = [];

	// Position tracking
	public column = 0;
	public line = 0;
	private position = 0;
	private startTagPosition = 0;

	private bufferCheckPosition = MAX_BUFFER_LENGTH;
	private applyCaseTransform: (name: string) => string = (name) => name;
	public entities: Record<string, string> = XML_PREDEFINED_ENTITIES;

	// Parser state
	private state = State.Begin;
	private braceDepth = 0;
	private hasDoctype = false;
	private sawRoot = false;
	private isEnded = false;

	// Buffers
	private attribute: Attribute = {
		name: "",
		value: "",
		valueType: AttributeValueSyntax.Boolean,
	};
	private cdata: number[] = [];
	private char: number[] = [];
	private comment: number[] = [];
	private doctype: number[] = [];
	private entity: number[] = [];
	private markupDeclaration: number[] = [];
	private pi: ProcessingInstruction = {
		target: "",
		data: "",
	};
	private quote = 0;
	private script = "";
	private tag: Tag = {
		name: "",
		attributes: {},
		selfClosing: false,
	};
	private textNode: TextNode = {
		value: "",
	};

	constructor(options: SAXOptions = {}, handlers: SAXHandlers = {}) {
		this.options = { ...SAXParser.defaultOptions, ...options };

		if (this.options.caseTransform === "lowercase") {
			this.applyCaseTransform = (string) => string.toLowerCase();
		} else if (this.options.caseTransform === "uppercase") {
			this.applyCaseTransform = (string) => string.toUpperCase();
		}

		if (this.options.namespaces) {
			this.namespaceStack = [Object.create(XML_PREDEFINED_NAMESPACES)];
		}

		this.handlers = handlers;
	}

	public end(): void {
		if (this.isEnded) {
			return;
		}

		this.flush();

		if (this.sawRoot && this.tagStack.length > 0) {
			this.fail("Unclosed root tag");
		}

		if (
			this.state !== State.Begin &&
			this.state !== State.BeginWhitespace &&
			this.state !== State.Text
		) {
			this.fail("Unexpected end");
		}

		this.char = "";
		this.isEnded = true;
	}

	/**
	 * Flushes any buffered character data that has not yet been emitted as events.
	 */
	public flush(): void {
		this.flushText();

		if (this.cdata.length > 0) {
			this.emitNode("onCdata", this.cdata);
			this.cdata.length = 0;
		}

		if (this.script.length > 0) {
			this.emitNode("onScript", this.script);
			this.script.length = 0;
		}
	}

	public write(chunk: Uint8Array): void {
		if (this.error) {
			throw this.error;
		}

		if (this.isEnded) {
			this.fail("Cannot write after close.");
			return;
		}

		let i = 0;

		while (i < chunk.length) {
			let byte = chunk[i++];

			if (this.options.trackPosition) {
				this.updatePosition(byte);
			}

			switch (this.state) {
				/**
				 * The absolute starting point of the parser.
				 * This state is only ever hit for the very first character of the document.
				 */
				case State.Begin: {
					this.state = State.BeginWhitespace;

					if (byte === 0xef || byte === 0xbb || byte === 0xbf) {
						continue;
					}

					this.beginWhitespace(byte);
					continue;
				}

				case State.Text: {
					if (this.sawRoot && this.tagStack.length > 0) {
						const startIndex = i - 1;

						while (
							byte &&
							byte !== Ascii.OpenAngle &&
							byte !== Ascii.Ampersand
						) {
							byte = chunk[i++];

							if (byte) {
								charCode = chunk.charCodeAt(i - 1);

								if (this.options.trackPosition) {
									this.updatePosition(charCode);
								}
							}
						}

						this.textNode += chunk.substring(startIndex, i - 1);
					}

					if (
						byte === Ascii.OpenAngle &&
						!(
							this.sawRoot &&
							this.tagStack.length === 0 &&
							this.options.mode !== "xml"
						)
					) {
						this.state = State.OpenWaka;
						this.startTagPosition = this.position;
						continue;
					}

					if (
						!isWhitespace(byte) &&
						(!this.sawRoot || this.tagStack.length === 0)
					) {
						this.fail("Text data outside of root node.");
					}

					if (byte === Ascii.Ampersand) {
						this.state = State.TextEntity;
						continue;
					}

					this.textNode.value.push(byte);
					continue;
				}

				case State.Attribute: {
					/**
					 * Skip whitespace while parsing attributes inside a tag.
					 *
					 * @example
					 * Input:
					 *   <div class="box" id="main">
					 *
					 * Character flow:
					 *   ' ' → whitespace → ignored
					 *   'i' → start parsing next attribute (`id`)
					 */
					if (isWhitespace(byte)) {
						continue;
					}

					/**
					 * Detects the end of an opening tag.
					 *
					 * When `>` is encountered, the current tag declaration is complete.
					 * The tokenizer finalizes the tag by calling `openTag()` and then
					 * continues parsing the document content that follows.
					 *
					 * @example
					 * Input:
					 *   <div>
					 *
					 * Character flow:
					 *   '<' → start tag
					 *   'd','i','v' → read tag name
					 *   '>' → tag complete → `openTag()` called
					 */
					if (byte === Ascii.CloseAngle) {
						this.processOpenTag();
						continue;
					}

					/**
					 * Detects the start of a closing tag.
					 *
					 * If a `/` appears immediately after `<`, this indicates a closing tag.
					 *
					 * @example
					 * Input:
					 *   </div>
					 *
					 * Character flow:
					 *   '<' → open tag state
					 *   '/' → OPEN_TAG_SLASH state
					 *   'd','i','v' → read tag name
					 *   '>' → tag closes
					 */
					if (byte === Ascii.ForwardSlash) {
						this.state = State.OpenTagSlash;
						continue;
					}

					// Begin parsing a new attribute name
					if (isNameStartCharacter(codePoint)) {
						this.newAttribute(char);
						continue; // Jumps to the next character
					}

					this.fail("Invalid attribute name");
					continue;
				}

				case State.AttributeName: {
					if (isWhitespace(byte)) {
						this.state = State.AttributeNameSawWhitespace;
						continue;
					}

					if (byte === Ascii.Equal) {
						this.state = State.AttributeValue;
						continue;
					}

					if (byte === Ascii.CloseAngle) {
						if (this.options.mode === "xml") {
							this.fail(PARSE_ERROR.BooleanAttributeInXml);
						}

						this.attribute.value = this.attribute.name;
						this.processAttribute();
						this.processOpenTag();
						continue;
					}

					if (isNameCharacter(codePoint)) {
						this.attribute.name.push(byte); // Append the character
						continue; // Jumps to the next character in the while loop
					}

					this.fail("Invalid attribute name");
					continue;
				}

				/**
				 * @example
				 * ```
				 * <input disabled>           // boolean/no-value attribute (value defaults to "")
				 * <div class = "container">  // whitespace before '=' is allowed
				 * <div data-id  ="1">        // multiple spaces tolerated
				 * ```
				 */
				case State.AttributeNameSawWhitespace: {
					if (isWhitespace(byte)) {
						continue;
					}

					if (byte === Ascii.Equal) {
						this.state = State.AttributeValue;
						continue;
					}

					if (byte === Ascii.ForwardSlash) {
						if (this.options.mode === "xml") {
							this.fail(PARSE_ERROR.BooleanAttributeInXml);
						}

						this.state = State.OpenTagSlash;
						continue;
					}

					if (byte === Ascii.CloseAngle) {
						if (this.options.mode === "xml") {
							this.fail(PARSE_ERROR.BooleanAttributeInXml);
						}

						this.processOpenTag();
						continue;
					}

					if (isNameStartCharacter(codePoint)) {
						this.newAttribute(char);
						continue;
					}

					this.fail("Attribute without value");
					this.tag.attributes[this.attribute.name] = "";
					this.attribute.value = "";
					this.emitNode("onAttribute", {
						name: this.attribute.name,
						value: "",
						valueType: AttributeValueSyntax.Boolean,
					});
					this.attribute.name.length = 0;

					this.fail("Invalid attribute name");
					this.state = State.Attribute;
					continue;
				}

				case State.AttributeValue: {
					// Skip whitespace between '=' and the start of the value.
					if (isWhitespace(byte)) {
						continue;
					}

					if (isQuote(byte)) {
						this.quote = byte;
						this.state = State.AttributeValueQuoted;

						if (byte === Ascii.DoubleQuote) {
							this.attribute.valueType = AttributeValueSyntax.DoubleQuoted;
						}

						if (byte === Ascii.SingleQuote) {
							this.attribute.valueType = AttributeValueSyntax.SingleQuoted;
						}

						continue;
					}

					if (byte === Ascii.OpenBrace) {
						if (this.options.mode !== "jsx") {
							this.fail("JSX expressions are only allowed in JSX mode");
							continue;
						}

						this.state = State.JsxAttributeExpression;
						this.braceDepth += 1;
						this.attribute.value.push(byte);
						this.attribute.valueType = AttributeValueSyntax.JsxExpression;
						continue;
					}

					if (this.options.mode !== "html") {
						this.fail(
							"Unquoted attribute values are only allowed in HTML mode",
						);
						continue;
					}

					this.state = State.AttributeValueUnquoted;
					this.attribute.value.push(byte);
					this.attribute.valueType = AttributeValueSyntax.Unquoted;
					continue;
				}

				// Entered after closing an attribute value (after the quote)
				case State.AttributeValueClosed: {
					// Whitespace means we can begin parsing the next attribute
					if (isWhitespace(byte)) {
						this.state = State.Attribute;
						continue;
					}

					if (byte === Ascii.CloseAngle) {
						this.processOpenTag();
						continue;
					}

					// Indicates a self closing tag
					if (byte === Ascii.ForwardSlash) {
						this.state = State.OpenTagSlash;
						continue;
					}

					// If another attribute starts immediately, whitespace is missing.
					// Emit an error, but recover by treating this as a new attribute.
					if (isNameStartCharacter(codePoint)) {
						this.fail(
							"Invalid attribute syntax: missing whitespace between attributes",
						);
						this.newAttribute(char);
						continue;
					}

					this.fail("Invalid attribute name"); // Any other character here is invalid
					continue;
				}

				case State.AttributeValueQuoted: {
					if (byte !== this.quote) {
						if (byte === Ascii.Ampersand) {
							this.state = State.AttributeValueEntityQuoted;
							continue;
						}

						this.attribute.value.push(byte);
						continue;
					}

					// Matching quote encountered:
					// The attribute value is complete.
					// Finalize and emit the attribute.
					this.processAttribute();

					this.quote = 0;
					this.state = State.AttributeValueClosed;
					continue;
				}

				case State.AttributeValueUnquoted: {
					if (!isAttributeValueEnd(byte)) {
						if (byte === Ascii.Ampersand) {
							this.state = State.AttributeValueEntityUnquoted;
							continue;
						}

						this.attribute.value.push(byte);
						continue;
					}

					this.processAttribute();

					if (byte === Ascii.ForwardSlash) {
						this.state = State.OpenTagSlash;
						continue;
					}

					if (byte === Ascii.CloseAngle) {
						this.processOpenTag();
						continue;
					}

					// Otherwise it was whitespace; expect another attribute
					this.state = State.Attribute;
					continue;
				}

				/**
				 * When parsing begins, it loops through the first characters
				 * of the document, delegating to `beginWhitespace` to consume
				 * empty space until it finds the opening root tag (or an error).
				 */
				case State.BeginWhitespace: {
					this.beginWhitespace(byte);
					continue;
				}

				case State.CData: {
					const startIndex = i - 1;

					while (byte && byte !== Ascii.CloseBracket) {
						byte = chunk[i++];

						if (byte) {
							charCode = chunk.charCodeAt(i - 1);

							if (this.options.trackPosition) {
								this.updatePosition(byte);
							}
						}
					}

					this.cdata += chunk.substring(startIndex, i - 1);

					if (byte === Ascii.CloseBracket) {
						this.state = State.CDataEnding;
					}

					continue;
				}

				// ONLY FOR XML
				case State.CDataEnding: {
					if (byte === Ascii.CloseBracket) {
						this.state = State.CDataEnding2;
						continue;
					}

					this.cdata.push(Ascii.CloseBracket, byte);
					this.state = State.CData;
					continue;
				}

				// ONLY FOR XML
				case State.CDataEnding2: {
					if (byte === Ascii.CloseAngle) {
						if (this.cdata) {
							this.emitNode("onCdata", this.cdata);
						}

						this.cdata.length = 0;
						this.state = State.Text;
						continue;
					}

					if (byte === Ascii.CloseBracket) {
						this.cdata.push(Ascii.CloseBracket);
						continue;
					}

					this.cdata.push(Ascii.CloseBracket, Ascii.CloseBracket, byte);
					this.state = State.CData;
					continue;
				}

				case State.CloseTag: {
					if (!this.tag.name) {
						if (isWhitespace(byte)) {
							continue;
						}

						if (!isNameStartCharacter(codePoint)) {
							this.fail("Invalid closing tag name.");
							continue;
						}

						this.tag.name.push(byte);
						continue;
					}

					if (byte === Ascii.CloseAngle) {
						this.processCloseTag();
						continue;
					}

					if (isNameCharacter(codePoint)) {
						this.tag.name.push(byte);
						continue;
					}

					if (!isWhitespace(byte)) {
						this.fail("Invalid tag name in closing tag");
						continue;
					}

					this.state = State.CloseTagSawWhitespace;
					continue;
				}

				case State.CloseTagSawWhitespace: {
					if (isWhitespace(byte)) {
						continue;
					}

					if (byte === Ascii.CloseAngle) {
						this.processCloseTag();
						continue;
					}

					this.fail("Invalid characters in closing tag");
					continue;
				}

				/**
				 * @example HTML / XML
				 * ```html
				 * <!-- This is an HTML and XML comment -->
				 * ```
				 */
				case State.Comment: {
					this.comment.value.push(char);

					if (this.comment.value.endsWith("-->")) {
						const comment = this.comment.slice(0, -3);

						if (comment) {
							this.emitNode("onComment", { value: comment });
						}

						this.comment.length = 0;

						// ONLY FOR HTML/XML
						if (this.doctype && this.hasDoctype !== true) {
							this.state = State.DoctypeDtd;
							continue;
						}

						this.state = State.Text;
						continue;
					}

					continue;
				}

				// ONLY FOR HTML/XML
				case State.Doctype: {
					if (byte === Ascii.CloseAngle) {
						this.state = State.Text;
						this.emitNode("onDoctype", this.doctype);
						this.hasDoctype = true; // remember we saw one
						continue;
					}

					this.doctype.push(byte);

					if (byte === Ascii.OpenBracket) {
						this.state = State.DoctypeDtd;
						continue;
					}

					if (isQuote(byte)) {
						this.quote = byte;
						this.state = State.DoctypeQuoted;
						continue;
					}

					continue;
				}

				// ONLY FOR HTML/XML
				case State.DoctypeDtd: {
					if (byte === Ascii.CloseBracket) {
						this.doctype.push(byte);
						this.state = State.Doctype;
						continue;
					}

					if (byte === Ascii.OpenAngle) {
						this.state = State.OpenWaka;
						this.startTagPosition = this.position;
						continue;
					}

					if (isQuote(byte)) {
						this.doctype.push(byte);
						this.quote = byte;
						this.state = State.DoctypeDtdQuoted;
						continue;
					}

					this.doctype.push(byte);
					continue;
				}

				case State.DoctypeDtdQuoted: {
					this.doctype.push(byte);

					if (byte === this.quote) {
						this.state = State.DoctypeDtd;
						this.quote = 0;
					}

					continue;
				}

				case State.DoctypeQuoted: {
					this.doctype.push(byte);

					if (byte === this.quote) {
						this.quote = 0;
						this.state = State.Doctype;
					}

					continue;
				}

				/**
				 * JSX attribute expression parsing state.
				 *
				 * In this state, the parser is inside a JSX attribute value that starts with `{`
				 * (e.g. `props={user}` or `onClick={() => doThing()}`), and it will keep consuming
				 * characters until the matching closing `}` is found. Nested braces are supported
				 * via `braceDepth`.
				 *
				 * @example
				 * ```tsx
				 * <User
				 *   id="42"
				 *   onClick={() => {
				 *     if (ready) {
				 *       start();
				 *     }
				 *   }}
				 *   props={{ name: user.name, flags: { admin: user.isAdmin } }}
				 * />
				 * ```
				 */
				case State.JsxAttributeExpression: {
					this.attribute.value.push(byte);

					if (byte === Ascii.OpenBrace) {
						this.braceDepth += 1;
					}

					if (byte === Ascii.CloseBrace) {
						this.braceDepth -= 1;

						if (this.braceDepth === 0) {
							this.processAttribute();
							this.state = State.AttributeValueClosed;
						}

						continue;
					}

					continue;
				}

				case State.OpenTag: {
					if (isNameCharacter(codePoint)) {
						this.tag.name.push(byte);
						continue;
					}

					if (byte === Ascii.CloseAngle) {
						this.processOpenTag();
						continue;
					}

					if (byte === Ascii.ForwardSlash) {
						this.state = State.OpenTagSlash;
						continue;
					}

					if (!isWhitespace(byte)) {
						this.fail("Invalid character in tag name");
					}

					this.state = State.Attribute;
					continue;
				}

				case State.OpenTagSlash: {
					// '/>' -> Self-closing tag
					// Used for:
					// - Void elements: <br />, <img />, <input />      (HTML)
					// - XML empty elements: <tag/>                     (XML)
					// - JSX components without children: <Component /> (JSX)
					if (byte === Ascii.CloseAngle) {
						this.processOpenTag(true);
						this.processCloseTag();
						continue;
					}

					this.fail("Forward-slash in opening tag not followed by >");
					this.state = State.Attribute;
					continue;
				}

				case State.OpenWaka: {
					if (isWhitespace(byte)) {
						continue;
					}

					// `<!` — Markup declaration
					// Contexts:
					// - Comment (HTML/XML): <!-- ... -->
					// - CDATA (XML): <![CDATA[ ... ]]>
					// - DOCTYPE (HTML/XML): <!DOCTYPE ...>
					if (byte === Ascii.ExclamationMark) {
						this.state = State.MarkupDeclaration;
						this.markupDeclaration.length = 0;
						continue;
					}

					// `<>` -> Opening fragment (JSX)
					// Represents a fragment with no tag name:
					// Example:
					//   <>
					//     <Nav />
					//   </>
					if (byte === Ascii.CloseAngle) {
						if (this.options.mode !== "jsx") {
							this.fail("Fragments are only allowed in JSX mode");
							continue;
						}

						this.newTag("");
						this.processOpenTag();
						continue;
					}

					// `</` -> Closing tag
					// Used for standard closing elements:
					// Example:
					//   </div>       (HTML, JSX, XML)
					//   </Component> (JSX - custom component)
					//   </>          (JSX - fragment)
					if (byte === Ascii.ForwardSlash) {
						this.newTag(true);
						continue;
					}

					// `<?` -> Processing instruction (XML)
					// Example:
					//   <?xml version="1.0"?>
					if (byte === Ascii.QuestionMark) {
						if (this.options.mode !== "xml") {
							this.fail("Processing instructions are only allowed in XML mode");
							continue;
						}

						this.state = State.ProcessingInstruction;
						this.resetProcessingInstruction();
						continue;
					}

					if (isNameStartCharacter(codePoint)) {
						this.newTag(char);
						continue;
					}

					// We just parsed `<` and the very next character is `/`.
					//
					// - In HTML, XML, and JSX: This is the universal standard for
					//   starting a closing tag (e.g., `</div>`).

					this.fail("Unencoded <");

					// if there was some whitespace, then add that in.
					if (this.startTagPosition + 1 < this.position) {
						const pad = this.position - this.startTagPosition;
						this.textNode += " ".repeat(pad);
					}

					this.textNode.value.push(Ascii.OpenAngle, byte);
					this.state = State.Text;
					continue;
				}

				case State.ProcessingInstruction: {
					if (byte === Ascii.QuestionMark) {
						this.state = State.ProcessingInstructionEnding;
						continue;
					}

					if (isWhitespace(byte)) {
						this.state = State.ProcessingInstructionData;
						continue;
					}

					this.pi.target.push(byte);
					continue;
				}

				case State.ProcessingInstructionData: {
					if (!this.pi.data && isWhitespace(byte)) {
						continue;
					}

					if (byte === Ascii.QuestionMark) {
						this.state = State.ProcessingInstructionEnding;
						continue;
					}

					this.pi.data.push(byte);
					continue;
				}

				case State.ProcessingInstructionEnding: {
					if (byte === Ascii.CloseAngle) {
						this.emitNode("onProcessingInstruction", {
							target: this.pi.target,
							data: this.pi.data,
						});
						this.resetProcessingInstruction();
						this.state = State.Text;
						continue;
					}

					this.pi.data.push(Ascii.QuestionMark, byte);
					this.state = State.ProcessingInstructionData;
					continue;
				}

				case State.MarkupDeclaration: {
					const sequence = this.markupDeclaration.push(byte);
					const upperSequence = sequence.toUpperCase();

					if (sequence === "--") {
						this.state = State.Comment;
						this.comment.length = 0;
						this.markupDeclaration.length = 0;
						continue;
					}

					if (
						this.doctype &&
						this.hasDoctype !== true &&
						this.markupDeclaration
					) {
						this.state = State.DoctypeDtd;
						this.doctype += `<!${this.markupDeclaration}${char}`;
						this.markupDeclaration.length = 0;
						continue;
					}

					if (upperSequence === "[CDATA[") {
						if (this.options.mode !== "xml") {
							this.fail("CDATA sections are only allowed in XML.");
							continue;
						}

						this.state = State.CData;
						this.markupDeclaration.length = 0;
						this.cdata.length = 0;
						continue;
					}

					if (upperSequence === "DOCTYPE") {
						this.state = State.Doctype;

						if (this.doctype || this.sawRoot) {
							this.fail("Inappropriately located doctype declaration");
						}

						this.doctype.length = 0;
						this.markupDeclaration.length = 0;
						continue;
					}

					if (byte === Ascii.CloseAngle) {
						this.emitNode("onMarkupDeclaration", this.markupDeclaration);
						this.markupDeclaration.length = 0;
						this.state = State.Text;
						continue;
					}

					if (isQuote(byte)) {
						this.quote = byte;
						this.markupDeclaration.push(byte);
						this.state = State.MarkupDeclarationQuoted;
						continue;
					}

					this.markupDeclaration.push(byte);
					continue;
				}

				case State.MarkupDeclarationQuoted: {
					if (byte === this.quote) {
						this.state = State.MarkupDeclaration;
						this.quote = 0;
					}

					this.markupDeclaration.push(byte);
					continue;
				}

				case State.AttributeValueEntityQuoted:
				case State.AttributeValueEntityUnquoted:
				case State.TextEntity: {
					let returnState: State;
					let buffer: "attributeValue" | "textNode";

					switch (this.state) {
						case State.TextEntity: {
							returnState = State.Text;
							buffer = "textNode";
							break;
						}

						case State.AttributeValueEntityQuoted: {
							returnState = State.AttributeValueQuoted;
							buffer = "attributeValue";
							break;
						}

						case State.AttributeValueEntityUnquoted: {
							returnState = State.AttributeValueUnquoted;
							buffer = "attributeValue";
							break;
						}
					}

					if (charCode === Ascii.Semicolon) {
						this[buffer] += this.parseEntity();
						this.entity = "";
						this.state = returnState;
						continue;
					}

					// If we have already started building an entity name
					if (this.entity.length) {
						if (byte === Ascii.Number || isNameCharacter(codePoint)) {
							this.entity.push(byte);
							continue; // Move to next input character
						}
					} else {
						if (byte === Ascii.Number || isNameStartCharacter(codePoint)) {
							this.entity.push(byte);
							continue; // Move to next input character
						}
					}

					this.fail("Invalid character in entity name");
					this[buffer].push(`&${this.entity}${char}`);
					this.entity.length = 0;
					this.state = returnState;
					continue;
				}

				default:
					throw new Error(`Unknown state: ${this.state}`);
			}
		} // End of the while loop

		if (this.position >= this.bufferCheckPosition) {
			this.checkBufferLength();
		}
	}

	/**
	 * Processes characters before the first tag of the document.
	 * Safely ignores leading spaces, tabs, and newlines.
	 *
	 * @param char The current character being evaluated.
	 */
	private beginWhitespace(byte: number): void {
		// Scenario 1: We found the opening bracket! The document officially begins here.
		// Shift state to start parsing the tag and mark our starting position.
		if (byte === Ascii.OpenAngle) {
			this.state = State.OpenWaka;
			this.startTagPosition = this.position;
			return;
		}

		// Scenario 2: We found a normal character (like a letter) before any tags.
		// This is invalid document structure. We emit an error to notify the user,
		// but gracefully recover by buffering it into a text node so the parser doesn't crash.
		if (!isWhitespace(byte)) {
			this.fail("Non-whitespace before first tag.");
			this.textNode.value.push(byte);
			this.state = State.Text;
		}
	}

	private checkBufferLength(): void {
		const maxBufferLength = Math.max(MAX_BUFFER_LENGTH, 10);
		let longestBufferLength = 0;

		if (this.textNode.length > maxBufferLength) {
			this.flushText();
		}

		if (this.cdata.length > maxBufferLength) {
			this.emitNode("onCdata", this.cdata);
			this.cdata.length = 0;
		}

		if (this.script.length > maxBufferLength) {
			this.emitNode("onScript", this.script);
			this.script.length = 0;
		}

		longestBufferLength = Math.max(
			this.textNode.length,
			this.cdata.length,
			this.script.length,
			this.comment.length,
			this.doctype.length,
			this.entity.length,
			this.markupDeclaration.length,
			this.tagName.length,
			this.attributeName.length,
			this.attributeValue.length,
			this.piTarget.length,
			this.piData.length,
		);

		this.bufferCheckPosition =
			MAX_BUFFER_LENGTH - longestBufferLength + this.position;
	}

	private parseEntity(): string {
		const entity = this.entity;
		let lowerCaseEntity = entity.toLowerCase();
		let number = Number.NaN;
		let numberString = "";

		// -- Handles named entities

		if (this.entities[entity]) {
			return this.entities[entity];
		}

		if (this.entities[lowerCaseEntity]) {
			return this.entities[lowerCaseEntity];
		}

		// -- Handles numeric entities

		if (lowerCaseEntity.charCodeAt(0) === Ascii.Number) {
			if (lowerCaseEntity.charCodeAt(1) === 0x78) {
				lowerCaseEntity = lowerCaseEntity.slice(2);
				number = Number.parseInt(lowerCaseEntity, 16);
				numberString = number.toString(16);
			} else {
				lowerCaseEntity = lowerCaseEntity.slice(1);
				number = Number.parseInt(lowerCaseEntity, 10);
				numberString = number.toString(10);
			}
		}

		let i = 0;

		while (
			i < lowerCaseEntity.length &&
			lowerCaseEntity.charCodeAt(i) === Ascii.Zero
		) {
			i++;
		}

		lowerCaseEntity = lowerCaseEntity.slice(i);

		if (
			Number.isNaN(number) ||
			numberString.toLowerCase() !== lowerCaseEntity ||
			number < 0 ||
			number > 0x10ffff
		) {
			this.fail("Invalid character entity");
			return `&${this.entity};`;
		}

		return String.fromCodePoint(number);
	}

	private flushText(): void {
		if (this.textNode) {
			this.emit("onText", { value: this.textNode.value });
		}

		this.textNode.length = 0;
	}

	private emit<T extends keyof SAXHandlers>(
		event: T,
		...data: Parameters<NonNullable<SAXHandlers[T]>>
	): void {
		this.handlers[event]?.(...data);
	}

	private emitNode<T extends keyof SAXHandlers>(
		event: T,
		...data: Parameters<NonNullable<SAXHandlers[T]>>
	): void {
		if (this.textNode.length > 0) {
			this.flushText();
		}

		this.emit(event, ...data);
	}

	private fail(message: string): void {
		this.flushText();

		if (this.options.trackPosition) {
			message += `\nLine: ${this.line}\nColumn: ${this.column}\nChar: ${this.char}`;
		}

		const error = new Error(message);
		this.error = error;
		this.emit("onError", error);
	}

	private processAttribute(): void {
		if (this.options.mode === "html") {
			this.attribute.name = this.applyCaseTransform(this.attribute.name);
		}

		if (this.options.namespaces) {
			if (
				this.attributeList.some(
					(attribute) => attribute.name === this.attribute.name,
				)
			) {
				this.resetAttribute();
				return;
			}

			const { localName, prefix } = parseQualifiedName(
				this.attribute.name,
				true,
			);

			if (prefix === "xmlns") {
				// namespace binding attribute. push the binding into scope
				if (
					localName === "xml" &&
					this.attribute.value !== XML_PREDEFINED_NAMESPACES.xml
				) {
					this.fail(
						`xml: prefix must be bound to ${XML_PREDEFINED_NAMESPACES.xml}\nActual: ${this.attribute.value}`,
					);
				} else if (
					localName === "xmlns" &&
					this.attribute.value !== XML_PREDEFINED_NAMESPACES.xmlns
				) {
					this.fail(
						`xmlns: prefix must be bound to ${XML_PREDEFINED_NAMESPACES.xmlns}\nActual: ${this.attribute.value}`,
					);
				} else {
					const parentNs = this.namespaceStack[this.namespaceStack.length - 1];

					if (this.tag.ns === parentNs) {
						this.tag.ns = Object.create(parentNs);
					}

					this.tag.ns[localName] = this.attribute.value;
				}
			}

			this.attributeList.push({
				name: this.attribute.name,
				value: this.attribute.value,
				valueType: this.attribute.valueType,
			});

			this.resetAttribute();
			return;
		}

		if (Object.hasOwn(this.tag.attributes, this.attribute.name)) {
			this.resetAttribute();
			return;
		}

		this.tag.attributes[this.attribute.name] = this.attribute.value;
		this.emitNode("onAttribute", {
			name: this.attribute.name,
			value: this.attribute.value,
			valueType: this.attribute.valueType,
		});

		this.resetAttribute();
	}

	private processCloseTag(): void {
		if (!this.tag.name) {
			this.fail("Weird empty close tag.");
			this.textNode.value.push(
				Ascii.OpenAngle,
				Ascii.ForwardSlash,
				Ascii.CloseAngle,
			);
			this.state = State.Text;
			return;
		}

		if (this.script.length > 0) {
			if (this.tag.name !== "script") {
				this.script += `</${this.tag.name}>`;
				this.tag.name.length = 0;
				this.state = State.Script;
				return;
			}

			this.emitNode("onScript", this.script);
			this.script.length = 0;
		}

		// first make sure that the closing tag actually exists.
		// <a><b></c></b></a> will close everything, otherwise.

		let targetTagName = this.tag.name;

		if (this.options.mode === "html") {
			targetTagName = this.applyCaseTransform(targetTagName);
		}

		let index = this.tagStack.length;
		while (index--) {
			if (this.tagStack[index].name !== targetTagName) {
				this.fail("Unexpected close tag");
			} else {
				break;
			}
		}

		if (index < 0) {
			this.fail(`Unmatched closing tag: ${this.tag.name}`);
			this.textNode.value.push(
				Ascii.OpenAngle,
				Ascii.ForwardSlash,
				this.tag.name,
				Ascii.CloseAngle,
			);
			this.state = State.Text;
			return;
		}

		while (this.tagStack.length > index) {
			const tag = this.tagStack.pop()!;

			if (this.options.namespaces) {
				this.namespaceStack.pop();
			}

			this.emitNode("onCloseTag", tag);
		}

		this.resetAttribute();
		this.attributeList.length = 0;
		this.state = State.Text;
	}

	private processOpenTag(selfClosing = false): void {
		if (this.options.namespaces) {
			const tag = this.tag;
			const qualifiedName = parseQualifiedName(this.tag.name, false);

			tag.prefix = qualifiedName.prefix;
			tag.localName = qualifiedName.localName;
			tag.uri = tag.ns[qualifiedName.prefix] ?? "";

			if (tag.prefix && !tag.uri) {
				this.fail(`Unbound namespace prefix: ${JSON.stringify(this.tag.name)}`);
				tag.uri = qualifiedName.prefix;
			}

			for (const { name, value, valueType } of this.attributeList) {
				const qualifiedName = parseQualifiedName(name, true);

				let uri = "";

				if (qualifiedName.prefix !== "") {
					uri = tag.ns[qualifiedName.prefix] ?? "";
				}

				const attribute: Attribute = {
					name,
					value,
					valueType,
					prefix: qualifiedName.prefix,
					localName: qualifiedName.localName,
					uri,
				};

				// if there's any attributes with an undefined namespace,
				// then fail on them now.
				if (qualifiedName.prefix && qualifiedName.prefix !== "xmlns" && !uri) {
					this.fail(
						`Unbound namespace prefix: ${JSON.stringify(qualifiedName.prefix)}`,
					);
					attribute.uri = qualifiedName.prefix;
				}

				this.tag.attributes[name] = attribute;
				this.emitNode("onAttribute", attribute);
			}

			this.attributeList.length = 0;
			this.namespaceStack.push(tag.ns);
		}

		this.tag.selfClosing = selfClosing;
		this.sawRoot = true;
		this.tagStack.push(this.tag);
		this.emitNode("onOpenTag", this.tag);

		// Not self-closing (false): e.g., <div id="app">. This means the tag has "inside" content (children or text) that we need to parse next.
		// Self-closing (true): e.g., <img src="cat.jpg" />. This tag is immediately done; there is no "inside" content.

		if (!selfClosing) {
			if (
				this.options.mode === "html" &&
				this.tag.name.toLowerCase() === "script"
			) {
				this.state = State.Script;
			} else {
				this.state = State.Text;
			}
		}

		this.resetAttribute();
		this.attributeList.length = 0;
	}

	/**
	 * Initializes a new attribute and transitions the parser to `ATTRIBUTE_NAME`.
	 *
	 * Called when a valid name-start character is encountered inside a tag.
	 * This method:
	 * - Seeds the attribute name with its first character
	 * - Clears any previous attribute value buffer
	 * - Defaults the value type to `NoValue` (boolean attribute)
	 *
	 * @param char - The first character of the attribute name (must satisfy `isNameStartCharacter`).
	 *
	 * @example
	 * ``` js
	 * // Parsing:
	 * // <input disabled>
	 * //         ^
	 * // When 'd' is encountered:
	 * newAttribute("d");
	 * ```
	 * @example
	 * ``` js
	 * // Parsing:
	 * // <div class="container">
	 * //      ^
	 * // When 'c' is encountered:
	 * newAttribute("c");
	 * ```
	 */
	private newAttribute(byte: number): void {
		this.attribute = {
			name: byte,
			value: "",
			valueType: AttributeValueSyntax.Boolean,
		};

		this.state = State.AttributeName;
	}

	private newTag(char: string, isCloseTag = false): void {
		const currentNs = this.options.namespaces
			? this.namespaceStack[this.namespaceStack.length - 1]
			: undefined;

		this.tag = {
			name: char,
			attributes: {},
			selfClosing: false,
			...(this.options.namespaces ? { ns: currentNs } : {}),
		};

		if (isCloseTag) {
			this.state = State.CloseTag;
		} else {
			this.state = State.OpenTag;
		}
	}

	private resetAttribute(): void {
		this.attribute.name.length = 0;
		this.attribute.value.length = 0;
		this.attribute.valueType = AttributeValueSyntax.Boolean;
	}

	private resetProcessingInstruction(): void {
		this.pi.target.length = 0;
		this.pi.data.length = 0;
	}

	private resetTag(): void {
		this.tag = {
			name: "",
			attributes: {},
			selfClosing: false,
		};
	}

	public reset(): void {
		this.error = null;
		this.tagStack.length = 0;
		this.attributeList.length = 0;

		this.bufferCheckPosition = MAX_BUFFER_LENGTH;
		this.column = 0;
		this.line = 0;
		this.position = 0;
		this.startTagPosition = 0;
		this.braceDepth = 0;

		this.hasDoctype = false;
		this.isEnded = false;
		this.sawRoot = false;
		this.state = State.Begin;

		// Reset namespaces if enabled
		if (this.options.namespaces) {
			this.namespaceStack = [Object.create(XML_PREDEFINED_NAMESPACES)];
		}

		this.resetAttribute();
		this.resetProcessingInstruction();
		this.resetTag();

		this.cdata.length = 0;
		this.char = "";
		this.comment.value = "";
		this.doctype.length = 0;
		this.entity = "";
		this.quote = 0;
		this.markupDeclaration = "";
		this.script = "";
		this.textNode.value = "";
	}

	private updatePosition(byte: number): void {
		this.position += 1;

		if (byte === Ascii.LineFeed) {
			this.line += 1;
			this.column = 0;
			return;
		}

		this.column += 1;
	}
}
