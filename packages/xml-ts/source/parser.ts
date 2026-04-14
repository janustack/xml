import { Ascii } from "./ascii.";
import {
	isNameChar,
	isNameStartChar,
	isQuote,
	isWhitespace,
} from "./character.js";
import {
	BUFFERS,
	MAX_BUFFER_LENGTH,
	NAMESPACES,
	XML_PREDEFINED_ENTITIES,
} from "./constants.js";
import { AttributeValueSyntax, Mode, ParseError, State } from "./enums.js";
import type {
	Attribute,
	NamespaceBinding,
	ProcessingInstruction,
	SAXHandlers,
	SAXOptions,
	Tag,
} from "./types.js";
import { isAttributeEnd, parseQualifiedName } from "./utils.js";

export class Parser {
	public static decoder = new TextDecoder();

	public static defaultOptions: SAXOptions = {
		caseTransform: "preserve",
		mode: Mode.Xml,
		namespaces: false,
		trackPosition: false,
	};

	public error: Error | null = null;
	public handlers: SAXHandlers;
	public options: SAXOptions;

	// List implemented as an array of Attribute objects
	private attributeList: Attribute[] = [];
	private namespaceStack: NamespaceBinding[] = [Object.create(NAMESPACES)];
	// Stack implemented as an array of Tag objects
	private tagStack: Tag[] = [];

	// Position tracking
	public column = 0;
	public line = 0;
	private position = 0;
	private startTagPosition = 0;

	private bufferCheckPosition = MAX_BUFFER_LENGTH;
	private applyCaseTransform: (name: string) => string = (name) => name;
	public entities = XML_PREDEFINED_ENTITIES;

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
	private cdata = "";
	private char = "";
	private comment = "";
	private doctype = "";
	private entity = "";
	private markupDeclaration = "";
	private pi: ProcessingInstruction = {
		target: "",
		data: "",
	};
	private quote = 0;
	private script = "";
	private tag: Tag = {
		name: "",
		attributes: {},
		isSelfClosing: false,
	};
	private textNode = "";

	constructor(options: SAXOptions = {}, handlers: SAXHandlers = {}) {
		this.options = { ...Parser.defaultOptions, ...options };

		if (this.options.caseTransform === "lowercase") {
			this.applyCaseTransform = (string) => string.toLowerCase();
		} else if (this.options.caseTransform === "uppercase") {
			this.applyCaseTransform = (string) => string.toUpperCase();
		}

		if (this.options.namespaces) {
			this.namespaceStack = [Object.create(NAMESPACES)];
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

		if (this.cdata !== "") {
			this.emitNode("onCdata", this.cdata);
			this.cdata = "";
		}

		if (this.script !== "") {
			this.emitNode("onScript", this.script);
			this.script = "";
		}
	}

	public write(chunk: Uint8Array | string): void {
		if (this.error) {
			throw this.error;
		}

		if (this.isEnded) {
			this.fail("Cannot write after close.");
			return;
		}

		if (chunk instanceof Uint8Array) {
			chunk = Parser.decoder.decode(chunk, { stream: true });
		}

		let i = 0;
		let char = "";

		while (i < chunk.length) {
			let charCode = chunk.charCodeAt(i);
			const codePoint = chunk.codePointAt(i)!;
			char = chunk[i++];

			this.char = char;

			this.updatePosition(charCode);

			switch (this.state) {
				/**
				 * The absolute starting point of the parser.
				 * This state is only ever hit for the very first character of the document.
				 */
				case State.Begin: {
					this.state = State.BeginWhitespace;

					if (charCode === 0xfeff) {
						continue;
					}

					this.beginWhitespace(charCode);
					continue;
				}

				case State.Text: {
					if (this.sawRoot && this.tagStack.length > 0) {
						const startIndex = i - 1;

						while (
							char &&
							charCode !== Ascii.OpenAngle &&
							charCode !== Ascii.Ampersand
						) {
							char = chunk[i++];

							if (char) {
								charCode = chunk.charCodeAt(i - 1);
								this.updatePosition(charCode);
							}
						}

						this.textNode += chunk.substring(startIndex, i - 1);
					}

					if (
						charCode === Ascii.OpenAngle &&
						!(
							this.sawRoot &&
							this.tagStack.length === 0 &&
							this.options.mode !== Mode.Xml
						)
					) {
						this.state = State.OpenWaka;
						this.startTagPosition = this.position;
						continue;
					}

					if (
						!isWhitespace(charCode) &&
						(!this.sawRoot || this.tagStack.length === 0)
					) {
						this.fail("Text data outside of root node.");
					}

					if (charCode === Ascii.Ampersand) {
						this.state = State.TextEntity;
						continue;
					}

					this.textNode += char;
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
					if (isWhitespace(charCode)) {
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
					if (charCode === Ascii.CloseAngle) {
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
					if (charCode === Ascii.ForwardSlash) {
						this.state = State.OpenTagSlash;
						continue;
					}

					// Begin parsing a new attribute name
					if (isNameStartChar(codePoint)) {
						this.newAttribute(char);
						continue; // Jumps to the next character
					}

					this.fail("Invalid attribute name");
					continue;
				}

				case State.AttributeName: {
					if (isWhitespace(charCode)) {
						this.state = State.AttributeNameSawWhitespace;
						continue;
					}

					if (charCode === Ascii.Equal) {
						this.state = State.AttributeValue;
						continue;
					}

					if (charCode === Ascii.CloseAngle) {
						if (this.options.mode === Mode.Xml) {
							this.fail(ParseError.BooleanAttributeInXml);
						}

						this.attribute.value = this.attribute.name;
						this.processAttribute();
						this.processOpenTag();
						continue;
					}

					if (isNameChar(codePoint)) {
						this.attribute.name += char; // Append the character
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
					if (isWhitespace(charCode)) {
						continue;
					}

					if (charCode === Ascii.Equal) {
						this.state = State.AttributeValue;
						continue;
					}

					if (charCode === Ascii.ForwardSlash) {
						if (this.options.mode === Mode.Xml) {
							this.fail(ParseError.BooleanAttributeInXml);
						}

						this.state = State.OpenTagSlash;
						continue;
					}

					if (charCode === Ascii.CloseAngle) {
						if (this.options.mode === Mode.Xml) {
							this.fail(ParseError.BooleanAttributeInXml);
						}

						this.processOpenTag();
						continue;
					}

					if (isNameStartChar(codePoint)) {
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
					this.attribute.name = "";

					this.fail("Invalid attribute name");
					this.state = State.Attribute;
					continue;
				}

				case State.AttributeValue: {
					// Skip whitespace between '=' and the start of the value.
					if (isWhitespace(charCode)) {
						continue;
					}

					if (isQuote(charCode)) {
						this.quote = charCode;
						this.state = State.AttributeValueQuoted;

						if (charCode === Ascii.DoubleQuote) {
							this.attribute.valueType = AttributeValueSyntax.DoubleQuoted;
						}

						if (charCode === Ascii.SingleQuote) {
							this.attribute.valueType = AttributeValueSyntax.SingleQuoted;
						}

						continue;
					}

					if (charCode === Ascii.OpenBrace) {
						if (this.options.mode !== Mode.Jsx) {
							this.fail("JSX expressions are only allowed in JSX mode");
							continue;
						}

						this.state = State.JsxAttributeExpression;
						this.braceDepth += 1;
						this.attribute.value += char;
						this.attribute.valueType = AttributeValueSyntax.JsxExpression;
						continue;
					}

					// ONLY HTML:
					// Unquoted attribute values are valid in HTML (e.g. `value=foo`) but not in JSX or XML
					this.state = State.AttributeValueUnquoted;
					this.attribute.value = char;
					this.attribute.valueType = AttributeValueSyntax.Unquoted;
					continue;
				}

				case State.AttributeValueQuoted: {
					if (charCode !== this.quote) {
						if (charCode === Ascii.Ampersand) {
							this.state = State.AttributeValueEntityQuoted;
							continue;
						}

						this.attribute.value += char;
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

				// Entered after closing an attribute value (after the quote)
				case State.AttributeValueClosed: {
					// Whitespace means we can begin parsing the next attribute
					if (isWhitespace(charCode)) {
						this.state = State.Attribute;
						continue;
					}

					if (charCode === Ascii.CloseAngle) {
						this.processOpenTag();
						continue;
					}

					// Indicates a self closing tag
					if (charCode === Ascii.ForwardSlash) {
						this.state = State.OpenTagSlash;
						continue;
					}

					// If another attribute starts immediately, whitespace is missing.
					// Emit an error, but recover by treating this as a new attribute.
					if (isNameStartChar(codePoint)) {
						this.fail(
							"Invalid attribute syntax: missing whitespace between attributes",
						);
						this.newAttribute(char);
						continue;
					}

					this.fail("Invalid attribute name"); // Any other character here is invalid
					continue;
				}

				case State.AttributeValueUnquoted: {
					if (!isAttributeEnd(charCode)) {
						if (charCode === Ascii.Ampersand) {
							this.state = State.AttributeValueEntityUnquoted;
							continue;
						}

						this.attribute.value += char;
						continue;
					}

					this.processAttribute();

					if (charCode === Ascii.ForwardSlash) {
						this.state = State.OpenTagSlash;
						continue;
					}

					if (charCode === Ascii.CloseAngle) {
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
					this.beginWhitespace(charCode);
					continue;
				}

				case State.CData: {
					const startIndex = i - 1;

					while (char && charCode !== Ascii.CloseBracket) {
						char = chunk[i++];

						if (char) {
							charCode = chunk.charCodeAt(i - 1);
							this.updatePosition(charCode);
						}
					}

					this.cdata += chunk.substring(startIndex, i - 1);

					if (charCode === Ascii.CloseBracket) {
						this.state = State.CDataEnding;
					}

					continue;
				}

				// ONLY FOR XML
				case State.CDataEnding: {
					if (charCode === Ascii.CloseBracket) {
						this.state = State.CDataEnding2;
						continue;
					}

					this.cdata += `]${char}`;
					this.state = State.CData;
					continue;
				}

				// ONLY FOR XML
				case State.CDataEnding2: {
					if (charCode === Ascii.CloseAngle) {
						if (this.cdata) {
							this.emitNode("onCdata", this.cdata);
						}

						this.cdata = "";
						this.state = State.Text;
						continue;
					}

					if (charCode === Ascii.CloseBracket) {
						this.cdata += "]";
						continue;
					}

					this.cdata += `]]${char}`;
					this.state = State.CData;
					continue;
				}

				case State.CloseTag: {
					if (!this.tag.name) {
						if (isWhitespace(charCode)) {
							continue;
						}

						if (!isNameStartChar(codePoint)) {
							this.fail("Invalid closing tag name.");
							continue;
						}

						this.tag.name = char;
						continue;
					}

					if (charCode === Ascii.CloseAngle) {
						this.processCloseTag();
						continue;
					}

					if (isNameChar(codePoint)) {
						this.tag.name += char;
						continue;
					}

					if (!isWhitespace(charCode)) {
						this.fail("Invalid tag name in closing tag");
						continue;
					}

					this.state = State.CloseTagSawWhitespace;
					continue;
				}

				case State.CloseTagSawWhitespace:
					if (isWhitespace(charCode)) {
						continue;
					}

					if (charCode === Ascii.CloseAngle) {
						this.processCloseTag();
						continue;
					}

					this.fail("Invalid characters in closing tag");
					continue;

				/**
				 * @example HTML / XML
				 * ```html
				 * <!-- This is an HTML and XML comment -->
				 * ```
				 */
				case State.Comment: {
					this.comment += char;

					if (this.comment.endsWith("-->")) {
						const comment = this.comment.slice(0, -3);

						if (comment) {
							this.emitNode("onComment", comment);
						}

						this.comment = "";

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
					if (charCode === Ascii.CloseAngle) {
						this.state = State.Text;
						this.emitNode("onDoctype", this.doctype);
						this.hasDoctype = true; // remember we saw one
						continue;
					}

					this.doctype += char;

					if (charCode === Ascii.OpenBracket) {
						this.state = State.DoctypeDtd;
						continue;
					}

					if (isQuote(charCode)) {
						this.quote = charCode;
						this.state = State.DoctypeQuoted;
						continue;
					}

					continue;
				}

				// ONLY FOR HTML/XML
				case State.DoctypeDtd: {
					if (charCode === Ascii.CloseBracket) {
						this.doctype += char;
						this.state = State.Doctype;
						continue;
					}

					if (charCode === Ascii.OpenAngle) {
						this.state = State.OpenWaka;
						this.startTagPosition = this.position;
						continue;
					}

					if (isQuote(charCode)) {
						this.doctype += char;
						this.quote = charCode;
						this.state = State.DoctypeDtdQuoted;
						continue;
					}

					this.doctype += char;
					continue;
				}

				case State.DoctypeDtdQuoted: {
					this.doctype += char;

					if (charCode === this.quote) {
						this.state = State.DoctypeDtd;
						this.quote = 0;
					}

					continue;
				}

				case State.DoctypeQuoted: {
					this.doctype += char;

					if (charCode === this.quote) {
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
					this.attribute.value += char;

					if (charCode === Ascii.OpenBrace) {
						this.braceDepth += 1;
					}

					if (charCode === Ascii.CloseBrace) {
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
					if (isNameChar(codePoint)) {
						this.tag.name += char;
						continue;
					}

					if (charCode === Ascii.CloseAngle) {
						this.processOpenTag();
						continue;
					}

					if (charCode === Ascii.ForwardSlash) {
						this.state = State.OpenTagSlash;
						continue;
					}

					if (!isWhitespace(charCode)) {
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
					if (charCode === Ascii.CloseAngle) {
						this.processOpenTag(true);
						this.processCloseTag();
						continue;
					}

					this.fail("Forward-slash in opening tag not followed by >");
					this.state = State.Attribute;
					continue;
				}

				case State.OpenWaka: {
					if (isWhitespace(charCode)) {
						continue;
					}

					// `<!` — Markup declaration
					// Contexts:
					// - Comment (HTML/XML): <!-- ... -->
					// - CDATA (XML): <![CDATA[ ... ]]>
					// - DOCTYPE (HTML/XML): <!DOCTYPE ...>
					if (charCode === Ascii.ExclamationMark) {
						this.state = State.MarkupDeclaration;
						this.markupDeclaration = "";
						continue;
					}

					// `<>` -> Opening fragment (JSX)
					// Represents a fragment with no tag name:
					// Example:
					//   <>
					//     <Nav />
					//   </>
					if (charCode === Ascii.CloseAngle) {
						if (this.options.mode !== Mode.Jsx) {
							this.fail("Fragments are only allowed in JSX mode");
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
					if (charCode === Ascii.ForwardSlash) {
						this.newTag("", true);
						continue;
					}

					// `<?` -> Processing instruction (XML)
					// Example:
					//   <?xml version="1.0"?>
					if (charCode === Ascii.QuestionMark) {
						if (this.options.mode !== Mode.Xml) {
							this.fail("Processing instructions are only allowed in XML mode");
							continue;
						}

						this.state = State.ProcessingInstruction;
						this.resetProcessingInstruction();
						continue;
					}

					if (isNameStartChar(codePoint)) {
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

					this.textNode += `<${char}`;
					this.state = State.Text;
					continue;
				}

				case State.ProcessingInstruction: {
					if (charCode === Ascii.QuestionMark) {
						this.state = State.ProcessingInstructionEnding;
						continue;
					}

					if (isWhitespace(charCode)) {
						this.state = State.ProcessingInstructionData;
						continue;
					}

					this.pi.target += char;
					continue;
				}

				case State.ProcessingInstructionData: {
					if (!this.pi.data && isWhitespace(charCode)) {
						continue;
					}

					if (charCode === Ascii.QuestionMark) {
						this.state = State.ProcessingInstructionEnding;
						continue;
					}

					this.pi.data += char;
					continue;
				}

				case State.ProcessingInstructionEnding: {
					if (charCode === Ascii.CloseAngle) {
						this.emitNode("onProcessingInstruction", {
							target: this.pi.target,
							data: this.pi.data,
						});
						this.resetProcessingInstruction();
						this.state = State.Text;
						continue;
					}

					this.pi.data += `?${char}`;
					this.state = State.ProcessingInstructionData;
					continue;
				}

				case State.MarkupDeclaration: {
					const sequence = this.markupDeclaration + char;
					const upperSequence = sequence.toUpperCase();

					if (sequence === "--") {
						this.state = State.Comment;
						this.comment = "";
						this.markupDeclaration = "";
						continue;
					}

					if (
						this.doctype &&
						this.hasDoctype !== true &&
						this.markupDeclaration
					) {
						this.state = State.DoctypeDtd;
						this.doctype += `<!${this.markupDeclaration}${char}`;
						this.markupDeclaration = "";
						continue;
					}

					if (upperSequence === "[CDATA[") {
						if (this.options.mode !== Mode.Xml) {
							this.fail("CDATA sections are only allowed in XML.");
						}

						this.state = State.CData;
						this.markupDeclaration = "";
						this.cdata = "";
						continue;
					}

					if (upperSequence === "DOCTYPE") {
						this.state = State.Doctype;

						if (this.doctype || this.sawRoot) {
							this.fail("Inappropriately located doctype declaration");
						}

						this.doctype = "";
						this.markupDeclaration = "";
						continue;
					}

					if (charCode === Ascii.CloseAngle) {
						this.emitNode("onMarkupDeclaration", this.markupDeclaration);
						this.markupDeclaration = "";
						this.state = State.Text;
						continue;
					}

					if (isQuote(charCode)) {
						this.quote = charCode;
						this.markupDeclaration += char;
						this.state = State.MarkupDeclarationQuoted;
						continue;
					}

					this.markupDeclaration += char;
					continue;
				}

				case State.MarkupDeclarationQuoted: {
					if (charCode === this.quote) {
						this.state = State.MarkupDeclaration;
						this.quote = 0;
					}

					this.markupDeclaration += char;
					continue;
				}

				case State.AttributeValueEntityQuoted:
				case State.AttributeValueEntityUnquoted:
				case State.TextEntity: {
					let returnState: State;
					let buffer: (typeof BUFFERS)[number];

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
						if (charCode === Ascii.Number || isNameChar(codePoint)) {
							this.entity += char;
							continue; // Move to next input character
						}
					} else {
						if (charCode === Ascii.Number || isNameStartChar(codePoint)) {
							this.entity += char;
							continue; // Move to next input character
						}
					}

					this.fail("Invalid character in entity name");

					this[buffer] += `&${this.entity}${char}`;
					this.entity = "";
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
	private beginWhitespace(charCode: number): void {
		// Scenario 1: We found the opening bracket! The document officially begins here.
		// Shift state to start parsing the tag and mark our starting position.
		if (charCode === Ascii.OpenAngle) {
			this.state = State.OpenWaka;
			this.startTagPosition = this.position;
			return;
		}

		// Scenario 2: We found a normal character (like a letter) before any tags.
		// This is invalid document structure. We emit an error to notify the user,
		// but gracefully recover by buffering it into a text node so the parser doesn't crash.
		if (!isWhitespace(charCode)) {
			this.fail("Non-whitespace before first tag.");
			this.textNode = this.char;
			this.state = State.Text;
		}
	}

	private checkBufferLength(): void {
		const threshold = Math.max(MAX_BUFFER_LENGTH, 10);
		let maxActual = 0;

		for (const buffer of BUFFERS) {
			const len = this[buffer].length;

			if (len > threshold) {
				switch (buffer) {
					case "textNode": {
						this.flushText();
						break;
					}

					case "cdata": {
						this.emitNode("onCdata", this.cdata);
						this.cdata = "";
						break;
					}

					case "script": {
						this.emitNode("onScript", this.script);
						this.script = "";
						break;
					}

					default: {
						this.fail(`Max buffer length exceeded: ${buffer}`);
					}
				}
			}

			maxActual = Math.max(maxActual, len);
		}

		this.bufferCheckPosition = MAX_BUFFER_LENGTH - maxActual + this.position;
	}

	private parseEntity(): string {
		const entity = this.entity;
		let lowerCaseEntity = entity.toLowerCase();
		let number = NaN;
		let numStr = "";

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
				numStr = number.toString(16);
			} else {
				lowerCaseEntity = lowerCaseEntity.slice(1);
				number = Number.parseInt(lowerCaseEntity, 10);
				numStr = number.toString(10);
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
			numStr.toLowerCase() !== lowerCaseEntity ||
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
			this.emit("onText", this.textNode);
		}

		this.textNode = "";
	}

	private emit<T extends keyof SAXHandlers>(
		event: T,
		...args: Parameters<NonNullable<SAXHandlers[T]>>
	): void {
		const handler = this.handlers[event];

		if (!handler) {
			return;
		}

		handler(...args);
	}

	private emitNode<T extends keyof SAXHandlers>(
		event: T,
		...args: Parameters<NonNullable<SAXHandlers[T]>>
	): void {
		if (this.textNode) {
			this.flushText();
		}

		this.emit(event, ...args);
	}

	private fail(message: string): void {
		this.flushText();
		if (this.options.trackPosition) {
			message += `\nLine: ${this.line}\nColumn: ${this.column}\nChar: ${this.char}`;
		}
		const err = new Error(message);
		this.error = err;
		this.emit("onError", err);
	}

	private processAttribute(): void {
		if (this.options.mode === Mode.Html) {
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
				if (localName === "xml" && this.attribute.value !== NAMESPACES.xml) {
					this.fail(
						`xml: prefix must be bound to ${NAMESPACES.xml}\nActual: ${this.attribute.value}`,
					);
				} else if (
					localName === "xmlns" &&
					this.attribute.value !== NAMESPACES.xmlns
				) {
					this.fail(
						`xmlns: prefix must be bound to ${NAMESPACES.xmlns}\nActual: ${this.attribute.value}`,
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
			this.textNode += "</>";
			this.state = State.Text;
			return;
		}

		if (this.script) {
			if (this.tag.name !== "script") {
				this.script += `</${this.tag.name}>`;
				this.tag.name = "";
				this.state = State.Script;
				return;
			}

			this.emitNode("onScript", this.script);
			this.script = "";
		}

		// first make sure that the closing tag actually exists.
		// <a><b></c></b></a> will close everything, otherwise.

		let targetTagName = this.tag.name;

		if (this.options.mode === Mode.Html) {
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
			this.textNode += `</${this.tag.name}>`;
			this.state = State.Text;
			return;
		}

		while (this.tagStack.length > index) {
			const tag = this.tagStack.pop()!;
			this.tag = tag;

			if (this.options.namespaces) {
				this.namespaceStack.pop();
			}

			this.emitNode("onCloseTag", tag.name);
		}

		this.resetAttribute();
		this.attributeList.length = 0;
		this.state = State.Text;
	}

	private processOpenTag(selfClosing = false): void {
		if (this.options.namespaces) {
			const tag = this.tag;
			const qName = parseQualifiedName(this.tag.name, false);

			tag.prefix = qName.prefix;
			tag.localName = qName.localName;
			tag.uri = tag.ns[qName.prefix] ?? "";

			if (tag.prefix && !tag.uri) {
				this.fail(`Unbound namespace prefix: ${JSON.stringify(this.tag.name)}`);
				tag.uri = qName.prefix;
			}

			// handle deferred onAttribute events
			// Note: do not apply default ns to attributes:
			// http://www.w3.org/TR/REC-xml-names/#defaulting
			for (const { name, value, valueType } of this.attributeList) {
				const qName = parseQualifiedName(name);
				const prefix = qName.prefix;

				let uri = "";

				if (prefix !== "") {
					uri = tag.ns[prefix] ?? "";
				}

				const attribute: Attribute = {
					name,
					value,
					valueType,
					prefix,
					localName: qName.localName,
					uri,
				};

				// if there's any attributes with an undefined namespace,
				// then fail on them now.
				if (prefix && prefix !== "xmlns" && !uri) {
					this.fail(`Unbound namespace prefix: ${JSON.stringify(prefix)}`);
					attribute.uri = prefix;
				}

				this.tag.attributes[name] = attribute;
				this.emitNode("onAttribute", attribute);
			}

			this.attributeList.length = 0;
		}

		this.tag.isSelfClosing = selfClosing;
		this.sawRoot = true;
		this.tagStack.push(this.tag);
		this.emitNode("onOpenTag", this.tag);

		// Not self-closing (false): e.g., <div id="app">. This means the tag has "inside" content (children or text) that we need to parse next.
		// Self-closing (true): e.g., <img src="cat.jpg" />. This tag is immediately done; there is no "inside" content.

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
	 * @param char - The first character of the attribute name (must satisfy `isNameStartChar`).
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
	private newAttribute(char: string): void {
		this.attribute = {
			name: char,
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
			isSelfClosing: false,
			...(this.options.namespaces ? { ns: currentNs } : {}),
		};

		if (isCloseTag) {
			this.state = State.CloseTag;
		} else {
			this.state = State.OpenTag;
		}
	}

	private resetAttribute(): void {
		this.attribute = {
			name: "",
			value: "",
			valueType: AttributeValueSyntax.Boolean,
		};
	}

	private resetProcessingInstruction(): void {
		this.pi = {
			target: "",
			data: undefined,
		};
	}

	private resetTag(): void {
		this.tag = {
			name: "",
			attributes: {},
			isSelfClosing: false,
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
			this.namespaceStack = [Object.create(NAMESPACES)];
		}

		this.resetAttribute();
		this.resetProcessingInstruction();
		this.resetTag();

		this.cdata = "";
		this.char = "";
		this.comment = "";
		this.doctype = "";
		this.entity = "";
		this.quote = 0;
		this.markupDeclaration = "";
		this.script = "";
		this.textNode = "";
	}

	private updatePosition(charCode: number): void {
		if (!this.options.trackPosition) {
			return;
		}

		this.position += 1;

		if (charCode === Ascii.LineFeed) {
			this.line += 1;
			this.column = 0;
			return;
		}

		this.column += 1;
	}
}
