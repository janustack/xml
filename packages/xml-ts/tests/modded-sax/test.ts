type Attribute = {
	name: string;
	value: string;
	prefix?: string;
	localName?: string;
	uri?: string;
};

type ProcessingInstruction = {
	target: string;
	data: string;
};

type Tag = {
	name: string;
	attributes: Record<string, Attribute | string>;
	selfClosing?: boolean;
	ns?: Record<string, string>;
	prefix?: string;
	localName?: string;
	uri?: string;
};

const isNameStartCharacter =
	/[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/;

const isNameCharacter =
	/[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040.\d-]/;

const entityStart =
	/[#:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/;

const entityBody =
	/[#:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040.\d-]/;

const MAX_BUFFER_LENGTH = 64 * 1024;

const XML_PREDEFINED_ENTITIES = {
	amp: "&",
	apos: "'",
	gt: ">",
	lt: "<",
	quot: '"',
} as const;

const XML_PREDEFINED_NAMESPACES = {
	xml: "http://www.w3.org/XML/1998/namespace",
	xmlns: "http://www.w3.org/2000/xmlns/",
} as const;

const HTML_NAMED_CHARACTER_ENTITIES = {
	amp: "&",
	gt: ">",
	lt: "<",
	quot: '"',
	apos: "'",
	AElig: 198,
	Aacute: 193,
	Acirc: 194,
	Agrave: 192,
	Aring: 197,
	Atilde: 195,
	Auml: 196,
	Ccedil: 199,
	ETH: 208,
	Eacute: 201,
	Ecirc: 202,
	Egrave: 200,
	Euml: 203,
	Iacute: 205,
	Icirc: 206,
	Igrave: 204,
	Iuml: 207,
	Ntilde: 209,
	Oacute: 211,
	Ocirc: 212,
	Ograve: 210,
	Oslash: 216,
	Otilde: 213,
	Ouml: 214,
	THORN: 222,
	Uacute: 218,
	Ucirc: 219,
	Ugrave: 217,
	Uuml: 220,
	Yacute: 221,
	aacute: 225,
	acirc: 226,
	aelig: 230,
	agrave: 224,
	aring: 229,
	atilde: 227,
	auml: 228,
	ccedil: 231,
	eacute: 233,
	ecirc: 234,
	egrave: 232,
	eth: 240,
	euml: 235,
	iacute: 237,
	icirc: 238,
	igrave: 236,
	iuml: 239,
	ntilde: 241,
	oacute: 243,
	ocirc: 244,
	ograve: 242,
	oslash: 248,
	otilde: 245,
	ouml: 246,
	szlig: 223,
	thorn: 254,
	uacute: 250,
	ucirc: 251,
	ugrave: 249,
	uuml: 252,
	yacute: 253,
	yuml: 255,
	copy: 169,
	reg: 174,
	nbsp: 160,
	iexcl: 161,
	cent: 162,
	pound: 163,
	curren: 164,
	yen: 165,
	brvbar: 166,
	sect: 167,
	uml: 168,
	ordf: 170,
	laquo: 171,
	not: 172,
	shy: 173,
	macr: 175,
	deg: 176,
	plusmn: 177,
	sup1: 185,
	sup2: 178,
	sup3: 179,
	acute: 180,
	micro: 181,
	para: 182,
	middot: 183,
	cedil: 184,
	ordm: 186,
	raquo: 187,
	frac14: 188,
	frac12: 189,
	frac34: 190,
	iquest: 191,
	times: 215,
	divide: 247,
	OElig: 338,
	oelig: 339,
	Scaron: 352,
	scaron: 353,
	Yuml: 376,
	fnof: 402,
	circ: 710,
	tilde: 732,
	Alpha: 913,
	Beta: 914,
	Gamma: 915,
	Delta: 916,
	Epsilon: 917,
	Zeta: 918,
	Eta: 919,
	Theta: 920,
	Iota: 921,
	Kappa: 922,
	Lambda: 923,
	Mu: 924,
	Nu: 925,
	Xi: 926,
	Omicron: 927,
	Pi: 928,
	Rho: 929,
	Sigma: 931,
	Tau: 932,
	Upsilon: 933,
	Phi: 934,
	Chi: 935,
	Psi: 936,
	Omega: 937,
	alpha: 945,
	beta: 946,
	gamma: 947,
	delta: 948,
	epsilon: 949,
	zeta: 950,
	eta: 951,
	theta: 952,
	iota: 953,
	kappa: 954,
	lambda: 955,
	mu: 956,
	nu: 957,
	xi: 958,
	omicron: 959,
	pi: 960,
	rho: 961,
	sigmaf: 962,
	sigma: 963,
	tau: 964,
	upsilon: 965,
	phi: 966,
	chi: 967,
	psi: 968,
	omega: 969,
	thetasym: 977,
	upsih: 978,
	piv: 982,
	ensp: 8194,
	emsp: 8195,
	thinsp: 8201,
	zwnj: 8204,
	zwj: 8205,
	lrm: 8206,
	rlm: 8207,
	ndash: 8211,
	mdash: 8212,
	lsquo: 8216,
	rsquo: 8217,
	sbquo: 8218,
	ldquo: 8220,
	rdquo: 8221,
	bdquo: 8222,
	dagger: 8224,
	Dagger: 8225,
	bull: 8226,
	hellip: 8230,
	permil: 8240,
	prime: 8242,
	Prime: 8243,
	lsaquo: 8249,
	rsaquo: 8250,
	oline: 8254,
	frasl: 8260,
	euro: 8364,
	image: 8465,
	weierp: 8472,
	real: 8476,
	trade: 8482,
	alefsym: 8501,
	larr: 8592,
	uarr: 8593,
	rarr: 8594,
	darr: 8595,
	harr: 8596,
	crarr: 8629,
	lArr: 8656,
	uArr: 8657,
	rArr: 8658,
	dArr: 8659,
	hArr: 8660,
	forall: 8704,
	part: 8706,
	exist: 8707,
	empty: 8709,
	nabla: 8711,
	isin: 8712,
	notin: 8713,
	ni: 8715,
	prod: 8719,
	sum: 8721,
	minus: 8722,
	lowast: 8727,
	radic: 8730,
	prop: 8733,
	infin: 8734,
	ang: 8736,
	and: 8743,
	or: 8744,
	cap: 8745,
	cup: 8746,
	int: 8747,
	there4: 8756,
	sim: 8764,
	cong: 8773,
	asymp: 8776,
	ne: 8800,
	equiv: 8801,
	le: 8804,
	ge: 8805,
	sub: 8834,
	sup: 8835,
	nsub: 8836,
	sube: 8838,
	supe: 8839,
	oplus: 8853,
	otimes: 8855,
	perp: 8869,
	sdot: 8901,
	lceil: 8968,
	rceil: 8969,
	lfloor: 8970,
	rfloor: 8971,
	lang: 9001,
	rang: 9002,
	loz: 9674,
	spades: 9824,
	clubs: 9827,
	hearts: 9829,
	diams: 9830,
} as const;

const BUFFERS = [
	"comment",
	"sgmlDeclaration",
	"textNode",
	"tagName",
	"doctype",
	"piTarget",
	"piData",
	"entity",
	"attributeName",
	"attributeValue",
	"cdata",
	"script",
] as const;

const EVENTS = [
	"text",
	"processingInstruction",
	"sgmlDeclaration",
	"doctype",
	"comment",
	"openTagStart",
	"attribute",
	"openTag",
	"closeTag",
	"openCdata",
	"cdata",
	"closeCdata",
	"error",
	"end",
	"ready",
	"script",
	"openNamespace",
	"closeNamespace",
] as const;

enum State {
	Begin, // leading byte order mark or whitespace
	BeginWhitespace, // leading whitespace
	Text, // general stuff
	TextEntity, // &amp and such.
	OpenWaka, // <
	SgmlDeclaration, // <!BLARG
	SgmlDeclarationQuoted, // <!BLARG foo "bar
	Doctype, // <!DOCTYPE
	DoctypeQuoted, // <!DOCTYPE "//blah
	DoctypeDtd, // <!DOCTYPE "//blah" [ ...
	DoctypeDtdQuoted, // <!DOCTYPE "//blah" [ "foo
	CommentstartIndexng, // <!-
	Comment, // <!--
	CommentEnding, // <!-- blah -
	CommentEnded, // <!-- blah --
	CData, // <![CDATA[ something
	CDataEnding, // ]
	CDataEnding2, // ]]
	ProcessingInstruction, // <?hi
	ProcessingInstructionData, // <?hi there
	ProcessingInstructionEnding, // <?hi "there" ?
	OpenTag, // <strong
	OpenTagSlash, // <strong /
	Attribute, // <a
	AttributeName, // <a foo
	AttributeNameSawWhitespace, // <a foo _
	AttributeValue, // <a foo=
	AttributeValueQuoted, // <a foo="bar
	AttributeValueClosed, // <a foo="bar"
	AttributeValueUnquoted, // <a foo=bar
	AttributeValueEntityQuoted, // <foo bar="&quot;"
	AttributeValueEntityUnquoted, // <foo bar=&quot
	CloseTag, // </a
	CloseTagSawWhitespace, // </a   >
	Script, // <script> ...
	ScriptEnding, // <script> ... <
}

interface SAXHandlers {
	onAttribute?: (attribute: Attribute) => void;
	onCdata?: (cdata: string) => void;
	onOpenCdata?: () => void;
	onCloseCdata?: () => void;
	onCloseTag?: (name: string) => void;
	onComment?: (comment: string) => void;
	onDoctype?: (doctype: string) => void;
	onError?: (error: Error) => void;
	onSgmlDeclaration?: (declaration: string) => void;
	onOpenTag?: (tag: Tag) => void;
	onOpenTagStart?: (tag: Tag) => void;
	onProcessingInstruction?: (pi: ProcessingInstruction) => void;
	onScript?: (script: string) => void;
	onText?: (text: string) => void;
	onReady?: () => void;
	onEnd?: () => void;
}

export interface SAXOptions {
	lowercase?: boolean;
	lowercasetags?: boolean;
	normalize?: boolean;
	position?: boolean;
	trim?: boolean;
	xmlns?: boolean;
	noScript?: boolean;
	strictEntities?: boolean;
	unquotedAttributeValues?: boolean;
	unparsedEntities?: boolean;
}

function applyTextOptions(options: SAXOptions, text: string): string {
	if (options.trim) {
		text = text.trim();
	}

	if (options.normalize) {
		text = text.replace(/\s+/g, " ");
	}

	return text;
}

function isWhitespace(c: string): boolean {
	return c === " " || c === "\n" || c === "\r" || c === "\t";
}

function isQuote(c: string): boolean {
	return c === '"' || c === "'";
}

function isAttributeValueEnd(c: string): boolean {
	return c === ">" || isWhitespace(c);
}

function parseQualifiedName(
	name: string,
	attribute?: boolean,
): { prefix: string; localName: string } {
	let prefix = "";
	let localName = name;

	const colonIndex = name.indexOf(":");

	if (colonIndex >= 0) {
		prefix = name.slice(0, colonIndex);
		localName = name.slice(colonIndex + 1);
	}

	if (attribute && name === "xmlns") {
		prefix = "xmlns";
		localName = "";
	}

	return { prefix, localName };
}

export class SAXParser {
	private attributeList: [string, string][] = [];
	public error: Error | null = null;
	private strict: boolean;
	private column = 0;
	private line = 0;
	private position = 0;
	private state = State.Begin;
	private startTagPosition = 0;
	private bufferCheckPosition = MAX_BUFFER_LENGTH;
	private looseCase: "toLowerCase" | "toUpperCase" = "toUpperCase";
	private entities: Record<string, string> = {};
	private tagStack: Tag[] = [];
	public options: SAXOptions;
	public handlers: SAXHandlers;
	private character = "";
	private quote = "";
	private comment = "";
	private sgmlDeclaration = "";
	private textNode = "";
	private tagName = "";
	private pi.target = "";
	private pi.data = "";
	private entity = "";
	private attribute.name = "";
	private attribute.value = "";
	private cdata = "";
	private script = "";

	constructor(strict: boolean, options = {}) {
		this.clearBuffers();
		this.options = { ...options };
		this.options.lowercase =
			this.options.lowercase || this.options.lowercasetags;
		this.looseCase = this.options.lowercase ? "toLowerCase" : "toUpperCase";
		this.tagStack = [];
		this.closed = this.closedRoot = this.sawRoot = false;
		this.tag = this.error = null;
		this.strict = Boolean(strict);
		this.noScript = Boolean(strict || this.options.noScript);
		this.state = State.Begin;
		this.strictEntities = this.options.strictEntities;
		this.entities = this.strictEntities
			? Object.create(XML_PREDEFINED_ENTITIES)
			: Object.create(HTML_NAMED_CHARACTER_ENTITIES);

		// namespaces form a prototype chain.
		// it always points at the current tag,
		// which protos to its parent tag.
		if (this.options.xmlns) {
			this.ns = Object.create(XML_PREDEFINED_NAMESPACES);
		}

		// disallow unquoted attribute values if not otherwise configured
		// and strict mode is true
		if (this.options.unquotedAttributeValues === undefined) {
			this.options.unquotedAttributeValues = !strict;
		}

		// mostly just for error reporting
		this.trackPosition = this.options.position !== false;

		if (this.trackPosition) {
			this.position = this.line = this.column = 0;
		}

		this.emit("onReady");
	}

	private checkBufferLength(): void {
		const maxBufferLength = Math.max(MAX_BUFFER_LENGTH, 10);
		var longestBufferLength = 0;

		for (const buffer of BUFFERS) {
			const bufferLength = this[buffer].length;

			if (bufferLength > maxBufferLength) {
				switch (buffer) {
					case "textNode": {
						this.closeText();
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

			longestBufferLength = Math.max(longestBufferLength, maxBufferLength);
		}

		this.bufferCheckPosition =
			MAX_BUFFER_LENGTH - longestBufferLength + this.position;
	}

	public clearBuffers(): void {
		for (const buffer of BUFFERS) {
			this[buffer] = "";
		}
	}

	public close(): this {
		return this.write(null);
	}

	private closeText(): void {
		this.textNode.value = applyTextOptions(this.options, this.textNode.value);

		if (this.textNode.value) {
			this.emit("onText", this.textNode.value);
		}

		this.textNode.value = "";
	}

	public flushBuffers(): void {
		this.closeText();

		if (this.cdata !== "") {
			this.emitNode("onCdata", this.cdata);
			this.cdata = "";
		}

		if (this.script !== "") {
			this.emitNode("onScript", this.script);
			this.script = "";
		}
	}

	private emit<K extends keyof SAXHandlers>(
		event: K,
		...args: Parameters<NonNullable<SAXHandlers[K]>>
	): void {
		const handler = this[event];
		handler?.(...args);
	}

	private emitNode<K extends keyof SAXHandlers>(
		event: K,
		...args: Parameters<NonNullable<SAXHandlers[K]>>
	): void {
		if (this.textNode.value) {
			this.closeText();
		}

		this.emit(event, ...args);
	}

	private flushText(): void {
		this.textNode.value = applyTextOptions(this.options, this.textNode.value);

		if (this.textNode.value) {
			this.emit("onText", this.textNode.value);
		}

		this.textNode.value = "";
	}

	private fail(message: string): this {
		this.flushText();

		if (this.options.trackPosition) {
			message += `\nLine: ${this.line}\nColumn: ${this.column}\nChar: ${this.character}`;
		}

		const error = new Error(message);
		this.error = error;
		this.emit("onError", error);
		return this;
	}

	public end(): this {
		if (this.sawRoot && !this.closedRoot) {
			this.strictFail("Unclosed root tag");
		}

		if (
			this.state !== State.Begin &&
			this.state !== State.BeginWhitespace &&
			this.state !== State.Text
		) {
			this.fail("Unexpected end");
		}

		this.closeText();
		this.character = "";
		this.closed = true;
		this.emit("onEnd");
		return this;
	}

	private strictFail(message: string): void {
		if (this.strict) {
			this.fail(message);
		}
	}

	private newTag(): void {
		if (!this.strict) {
			this.tagName = this.tagName[this.looseCase]();
		}

		const parent = this.tagStack[this.tagStack.length - 1] || this;
		this.tag = { name: this.tagName, attributes: {} };

		// will be overridden if tag contails an xmlns="foo" or xmlns:foo="bar"
		if (this.options.xmlns) {
			this.tag.ns = parent.ns;
		}

		this.attributeList.length = 0;
		this.emitNode("onOpenTagStart", this.tag);
	}

	private processAttribute(): void {
		if (!this.strict) {
			this.attribute.name = this.attribute.name[this.looseCase]();
		}

		if (
			this.attributeList.indexOf(this.attribute.name) !== -1 ||
			Object.hasOwn(this.tag.attributes, this.attribute.name)
		) {
			this.attribute.name = "";
			this.attribute.value = "";
			return;
		}

		if (this.options.xmlns) {
			const { prefix, localName } = parseQualifiedName(
				this.attribute.name,
				true,
			);

			if (prefix === "xmlns") {
				// namespace binding attribute. push the binding into scope
				if (
					localName === "xml" &&
					this.attribute.value !== XML_PREDEFINED_NAMESPACES.xml
				) {
					this.strictFail(
						`xml: prefix must be bound to ${XML_PREDEFINED_NAMESPACES.xml}\nActual: ${this.attribute.value}`,
					);
				} else if (
					localName === "xmlns" &&
					this.attribute.value !== XML_PREDEFINED_NAMESPACES.xmlns
				) {
					this.strictFail(
						`xmlns: prefix must be bound to ${
							XML_PREDEFINED_NAMESPACES.xmlns
						}\nActual: ${this.attribute.value}`,
					);
				} else {
					const parentNs =
						this.tagStack[this.tagStack.length - 1]?.ns ?? this.ns;

					if (this.tag.ns === parentNs) {
						this.tag.ns = Object.create(parentNs);
					}

					this.tag.ns[localName] = this.attribute.value;
				}
			}

			// defer onattribute events until all attributes have been seen
			// so any new bindings can take effect. preserve attribute order
			// so deferred events can be emitted in document order
			this.attributeList.push([this.attribute.name, this.attribute.value]);
		} else {
			// in non-xmlns mode, we can emit the event right away
			this.tag.attributes[this.attribute.name] = this.attribute.value;
			this.emitNode("onAttribute", {
				name: this.attribute.name,
				value: this.attribute.value,
			});
		}

		this.attribute.name = "";
		this.attribute.value = "";
	}

	private processOpenTag(selfClosing = false): void {
		if (this.options.xmlns) {
			const { prefix, localName } = parseQualifiedName(this.tagName, false);

			this.tag.prefix = prefix;
			this.tag.localName = localName;
			this.tag.uri = this.tag.ns[prefix] ?? "";

			if (this.tag.prefix && !this.tag.uri) {
				this.strictFail(
					`Unbound namespace prefix: ${JSON.stringify(this.tagName)}`,
				);
				this.tag.uri = prefix;
			}

			const parentNs = this.tagStack[this.tagStack.length - 1]?.ns ?? this.ns;

			if (this.tag.ns && parentNs !== this.tag.ns) {
				for (const prefix of Object.keys(this.tag.ns)) {
					this.emitNode("onOpenNamespace", {
						prefix: prefix,
						uri: this.tag.ns[prefix],
					});
				}
			}

			// handle deferred onattribute events
			// Note: do not apply default ns to attributes:
			//   http://www.w3.org/TR/REC-xml-names/#defaulting
			for (const [name, value] of this.attributeList) {
				const qualifiedName = parseQualifiedName(name, true);

				let uri = "";

				if (qualifiedName.prefix !== "") {
					uri = this.tag.ns[qualifiedName.prefix] ?? "";
				}

				const attribute: Attribute = {
					name,
					value,
					prefix: qualifiedName.prefix,
					localName: qualifiedName.localName,
					uri: uri,
				};

				// if there's any attributes with an undefined namespace,
				// then fail on them now.
				if (qualifiedName.prefix && qualifiedName.prefix !== "xmlns" && !uri) {
					this.strictFail(
						`Unbound namespace prefix: ${JSON.stringify(qualifiedName.prefix)}`,
					);
					attribute.uri = qualifiedName.prefix;
				}

				this.tag.attributes[name] = attribute;
				this.emitNode("onAttribute", attribute);
			}

			this.attributeList.length = 0;
		}

		this.tag.selfClosing = selfClosing;
		this.sawRoot = true;
		this.tagStack.push(this.tag);
		this.emitNode("onOpenTag", this.tag);

		if (!selfClosing) {
			if (!this.noScript && this.tagName.toLowerCase() === "script") {
				this.state = State.Script;
			} else {
				this.state = State.Text;
			}

			this.tag = null;
			this.tagName = "";
		}

		this.attribute.name = "";
		this.attribute.value = "";
		this.attributeList.length = 0;
	}

	private processCloseTag(): void {
		if (!this.tagName) {
			this.strictFail("Weird empty close tag.");
			this.textNode.value += "</>";
			this.state = State.Text;
			return;
		}

		if (this.script) {
			if (this.tagName !== "script") {
				this.script += `</${this.tagName}>`;
				this.tagName = "";
				this.state = State.Script;
				return;
			}

			this.emitNode("onScript", this.script);
			this.script = "";
		}

		// first make sure that the closing tag actually exists.
		// <a><b></c></b></a> will close everything, otherwise.
		var index = this.tagStack.length;
		var tagName = this.tagName;

		if (!this.strict) {
			tagName = tagName[this.looseCase]();
		}

		while (index--) {
			if (this.tagStack[index].name !== tagName) {
				this.strictFail("Unexpected close tag");
			} else {
				break;
			}
		}

		if (index < 0) {
			this.strictFail(`Unmatched closing tag: ${this.tagName}`);
			this.textNode.value += `</${this.tagName}>`;
			this.state = State.Text;
			return;
		}

		this.tagName = tagName;

		var s = this.tagStack.length;
		while (s-- > index) {
			const tag = this.tagStack.pop()!;
			this.tag = tag;
			this.tagName = tag.name;
			this.emitNode("onCloseTag", this.tagName);

			const parentNs = this.tagStack[this.tagStack.length - 1]?.ns ?? this.ns;

			if (this.options.xmlns && tag.ns !== parentNs) {
				for (const prefix of Object.keys(tag.ns)) {
					this.emitNode("onCloseNamespace", {
						prefix,
						uri: tag.ns[prefix],
					});
				}
			}
		}

		if (index === 0) {
			this.closedRoot = true;
		}

		this.tagName = "";
		this.attribute.value = "";
		this.attribute.name = "";
		this.attributeList.length = 0;
		this.state = State.Text;
	}

	private parseEntity(): string {
		let entity = this.entity;
		var lowerCaseEntity = entity.toLowerCase();
		var number = Number.NaN;
		var numberString = "";

		if (this.entities[entity]) {
			return this.entities[entity];
		}

		if (this.entities[lowerCaseEntity]) {
			return this.entities[lowerCaseEntity];
		}

		entity = lowerCaseEntity;
		if (entity.startsWith("#")) {
			if (entity[1] === "x") {
				entity = entity.slice(2);
				number = Number.parseInt(entity, 16);
				numberString = number.toString(16);
			} else {
				entity = entity.slice(1);
				number = Number.parseInt(entity, 10);
				numberString = number.toString(10);
			}
		}

		entity = entity.replace(/^0+/, "");

		if (
			Number.isNaN(number) ||
			numberString.toLowerCase() !== entity ||
			number < 0 ||
			number > 0x10ffff
		) {
			this.strictFail("Invalid character entity");
			return `&${this.entity};`;
		}

		return String.fromCodePoint(number);
	}

	private beginWhitespace(character: string): void {
		if (character === "<") {
			this.state = State.OpenWaka;
			this.startTagPosition = this.position;
		} else if (!isWhitespace(character)) {
			// have to process this as a text node.
			// weird, but happens.
			this.strictFail("Non-whitespace before first tag.");
			this.textNode.value = this.character;
			this.state = State.Text;
		}
	}

	public write(chunk: string | null): this {
		if (this.error) {
			throw this.error;
		}

		if (this.closed) {
			return this.fail("Cannot write after close. Assign an onready handler.");
		}

		if (chunk === null) {
			return this.end();
		}

		if (typeof chunk === "object") {
			chunk = chunk.toString();
		}

		var i = 0;
		var character = "";

		while (true) {
			character = chunk.charAt(i++);
			this.character = character;

			if (!character) {
				break;
			}

			if (this.trackPosition) {
				this.position++;

				if (character === "\n") {
					this.line++;
					this.column = 0;
				} else {
					this.column++;
				}
			}

			switch (this.state) {
				case State.Begin: {
					this.state = State.BeginWhitespace;

					if (character === "\uFEFF") {
						continue;
					}

					this.beginWhitespace(character);
					continue;
				}

				case State.BeginWhitespace: {
					this.beginWhitespace(character);
					continue;
				}

				case State.Text: {
					if (this.sawRoot && !this.closedRoot) {
						const startIndex = i - 1;

						while (character && character !== "<" && character !== "&") {
							character = chunk.charAt(i++);

							if (character && this.trackPosition) {
								this.position++;
								if (character === "\n") {
									this.line++;
									this.column = 0;
								} else {
									this.column++;
								}
							}
						}

						this.textNode.value += chunk.substring(startIndex, i - 1);
					}

					if (
						character === "<" &&
						!(this.sawRoot && this.closedRoot && !this.strict)
					) {
						this.state = State.OpenWaka;
						this.startTagPosition = this.position;
					} else {
						if (
							!isWhitespace(character) &&
							(!this.sawRoot || this.closedRoot)
						) {
							this.strictFail("Text data outside of root node.");
						}
						if (character === "&") {
							this.state = State.TextEntity;
						} else {
							this.textNode.value += character;
						}
					}

					continue;
				}

				case State.Script: {
					if (character === "<") {
						this.state = State.ScriptEnding;
					} else {
						this.script += character;
					}

					continue;
				}

				case State.ScriptEnding: {
					if (character === "/") {
						this.state = State.CloseTag;
					} else {
						this.script += `<${character}`;
						this.state = State.Script;
					}

					continue;
				}

				case State.OpenWaka: {
					// either a /, ?, !, or text is coming next.
					if (character === "!") {
						this.state = State.SgmlDeclaration;
						this.sgmlDeclaration = "";
					} else if (isWhitespace(character)) {
						// wait for it...emitNode(this,
					} else if (isNameStartCharacter.test(character)) {
						this.state = State.OpenTag;
						this.tagName = character;
					} else if (character === "/") {
						this.state = State.CloseTag;
						this.tagName = "";
					} else if (character === "?") {
						this.state = State.ProcessingInstruction;
						this.pi.target = "";
						this.pi.data = "";
					} else {
						this.strictFail("Unencoded <");
						// if there was some whitespace, then add that in.
						if (this.startTagPosition + 1 < this.position) {
							const pad = this.position - this.startTagPosition;
							character = new Array(pad).join(" ") + character;
						}

						this.textNode.value += `<${character}`;
						this.state = State.Text;
					}
					continue;
				}

				case State.SgmlDeclaration:
					if (this.sgmlDeclaration + character === "--") {
						this.state = State.Comment;
						this.comment.value = "";
						this.sgmlDeclaration = "";
						continue;
					}

					if (this.doctype && this.doctype !== true && this.sgmlDeclaration) {
						this.state = State.DoctypeDtd;
						this.doctype += `<!${this.sgmlDeclaration}${character}`;
						this.sgmlDeclaration = "";
					} else if (
						(this.sgmlDeclaration + character).toUpperCase() === "[CDATA["
					) {
						this.emitNode("onOpenCdata");
						this.state = State.CData;
						this.sgmlDeclaration = "";
						this.cdata = "";
					} else if (
						(this.sgmlDeclaration + character).toUpperCase() === "DOCTYPE"
					) {
						this.state = State.Doctype;
						if (this.doctype || this.sawRoot) {
							this.strictFail("Inappropriately located doctype declaration");
						}

						this.doctype = "";
						this.sgmlDeclaration = "";
					} else if (character === ">") {
						this.emitNode("onSgmlDeclaration", this.sgmlDeclaration);
						this.sgmlDeclaration = "";
						this.state = State.Text;
					} else if (isQuote(character)) {
						this.state = State.SgmlDeclarationQuoted;
						this.sgmlDeclaration += character;
					} else {
						this.sgmlDeclaration += character;
					}
					continue;

				case State.SgmlDeclarationQuoted: {
					if (character === this.quote) {
						this.state = State.SgmlDeclaration;
						this.quote = "";
					}

					this.sgmlDeclaration += character;
					continue;
				}

				case State.Doctype: {
					if (character === ">") {
						this.state = State.Text;
						this.emitNode("onDoctype", this.doctype);
						this.doctype = true; // just remember that we saw it.
					} else {
						this.doctype += character;
						if (character === "[") {
							this.state = State.DoctypeDtd;
						} else if (isQuote(character)) {
							this.state = State.DoctypeQuoted;
							this.quote = character;
						}
					}

					continue;
				}

				case State.DoctypeQuoted: {
					this.doctype += character;

					if (character === this.quote) {
						this.quote = "";
						this.state = State.Doctype;
					}

					continue;
				}

				case State.DoctypeDtd: {
					if (character === "]") {
						this.doctype += character;
						this.state = State.Doctype;
					} else if (character === "<") {
						this.state = State.OpenWaka;
						this.startTagPosition = this.position;
					} else if (isQuote(character)) {
						this.doctype += character;
						this.state = State.DoctypeDtdQuoted;
						this.quote = character;
					} else {
						this.doctype += character;
					}
					continue;
				}

				case State.DoctypeDtdQuoted: {
					this.doctype += character;

					if (character === this.quote) {
						this.state = State.DoctypeDtd;
						this.quote = "";
					}

					continue;
				}

				case State.Comment: {
					if (character === "-") {
						this.state = State.CommentEnding;
					} else {
						this.comment.value += character;
					}

					continue;
				}

				case State.CommentEnding: {
					if (character === "-") {
						this.state = State.CommentEnded;
						this.comment.value = applyTextOptions(
							this.options,
							this.comment.value,
						);

						if (this.comment.value) {
							this.emitNode("onComment", this.comment.value);
						}

						this.comment.value = "";
					} else {
						this.comment.value += `-${character}`;
						this.state = State.Comment;
					}

					continue;
				}

				case State.CommentEnded: {
					if (character !== ">") {
						this.strictFail("Malformed comment");
						// allow <!-- blah -- bloo --> in non-strict mode,
						// which is a comment of " blah -- bloo "
						this.comment.value += `--${character}`;
						this.state = State.Comment;
					} else if (this.doctype && this.doctype !== true) {
						this.state = State.DoctypeDtd;
					} else {
						this.state = State.Text;
					}

					continue;
				}

				case State.CData: {
					const startIndex = i - 1;

					while (character && character !== "]") {
						character = chunk.charAt(i++);

						if (character && this.trackPosition) {
							this.position++;

							if (character === "\n") {
								this.line++;
								this.column = 0;
							} else {
								this.column++;
							}
						}
					}

					this.cdata += chunk.substring(startIndex, i - 1);

					if (character === "]") {
						this.state = State.CDataEnding;
					}

					continue;
				}

				case State.CDataEnding: {
					if (character === "]") {
						this.state = State.CDataEnding2;
					} else {
						this.cdata += `]${character}`;
						this.state = State.CData;
					}

					continue;
				}

				case State.CDataEnding2: {
					if (character === ">") {
						if (this.cdata) {
							this.emitNode("onCdata", this.cdata);
						}

						this.emitNode("onCloseCdata");
						this.cdata = "";
						this.state = State.Text;
					} else if (character === "]") {
						this.cdata += "]";
					} else {
						this.cdata += `]]${character}`;
						this.state = State.CData;
					}

					continue;
				}

				case State.ProcessingInstruction: {
					if (character === "?") {
						this.state = State.ProcessingInstructionEnding;
					} else if (isWhitespace(character)) {
						this.state = State.ProcessingInstructionData;
					} else {
						this.pi.target += character;
					}

					continue;
				}

				case State.ProcessingInstructionData: {
					if (!this.pi.data && isWhitespace(character)) {
						continue;
					} else if (character === "?") {
						this.state = State.ProcessingInstructionEnding;
					} else {
						this.pi.data += character;
					}
					continue;
				}

				case State.ProcessingInstructionEnding: {
					if (character === ">") {
						this.emitNode("onProcessingInstruction", {
							target: this.pi.target,
							data: this.pi.data,
						});
						this.pi.target = "";
						this.pi.data = "";
						this.state = State.Text;
					} else {
						this.pi.data += `?${character}`;
						this.state = State.ProcessingInstructionData;
					}
					continue;
				}

				case State.OpenTag: {
					if (isNameCharacter.test(character)) {
						this.tagName += character;
					} else {
						this.newTag();
						if (character === ">") {
							this.processOpenTag();
						} else if (character === "/") {
							this.state = State.OpenTagSlash;
						} else {
							if (!isWhitespace(character)) {
								this.strictFail("Invalid character in tag name");
							}
							this.state = State.Attribute;
						}
					}
					continue;
				}

				case State.OpenTagSlash: {
					if (character === ">") {
						this.processOpenTag(true);
						this.processCloseTag();
					} else {
						this.strictFail("Forward-slash in opening tag not followed by >");
						this.state = State.Attribute;
					}

					continue;
				}

				case State.Attribute: {
					// haven't read the attribute name yet.
					if (isWhitespace(character)) {
						continue;
					} else if (character === ">") {
						this.processOpenTag();
					} else if (character === "/") {
						this.state = State.OpenTagSlash;
					} else if (isNameStartCharacter.test(character)) {
						this.attribute.name = character;
						this.attribute.value = "";
						this.state = State.AttributeName;
					} else {
						this.strictFail("Invalid attribute name");
					}

					continue;
				}

				case State.AttributeName: {
					if (character === "=") {
						this.state = State.AttributeValue;
					} else if (character === ">") {
						this.strictFail("Attribute without value");
						this.attribute.value = this.attribute.name;
						this.processAttribute();
						this.processOpenTag();
					} else if (isWhitespace(character)) {
						this.state = State.AttributeNameSawWhitespace;
					} else if (isNameCharacter.test(character)) {
						this.attribute.name += character;
					} else {
						this.strictFail("Invalid attribute name");
					}

					continue;
				}

				case State.AttributeNameSawWhitespace: {
					if (character === "=") {
						this.state = State.AttributeValue;
					} else if (isWhitespace(character)) {
						continue;
					} else {
						this.strictFail("Attribute without value");
						this.tag.attributes[this.attribute.name] = "";
						this.attribute.value = "";
						this.emitNode("onAttribute", {
							name: this.attribute.name,
							value: "",
						});
						this.attribute.name = "";
						if (character === ">") {
							this.processOpenTag();
						} else if (isNameStartCharacter.test(character)) {
							this.attribute.name = character;
							this.state = State.AttributeName;
						} else {
							this.strictFail("Invalid attribute name");
							this.state = State.Attribute;
						}
					}
					continue;
				}

				case State.AttributeValue: {
					if (isWhitespace(character)) {
						continue;
					} else if (isQuote(character)) {
						this.quote = character;
						this.state = State.AttributeValueQuoted;
					} else {
						if (!this.options.unquotedAttributeValues) {
							this.fail("Unquoted attribute value");
						}
						this.state = State.AttributeValueUnquoted;
						this.attribute.value = character;
					}

					continue;
				}

				case State.AttributeValueQuoted:
					if (character !== this.quote) {
						if (character === "&") {
							this.state = State.AttributeValueEntityQuoted;
						} else {
							this.attribute.value += character;
						}
						continue;
					}
					this.processAttribute();
					this.quote = "";
					this.state = State.AttributeValueClosed;
					continue;

				case State.AttributeValueClosed: {
					if (isWhitespace(character)) {
						this.state = State.Attribute;
					} else if (character === ">") {
						this.processOpenTag();
					} else if (character === "/") {
						this.state = State.OpenTagSlash;
					} else if (isNameStartCharacter.test(character)) {
						this.strictFail("No whitespace between attributes");
						this.attribute.name = character;
						this.attribute.value = "";
						this.state = State.AttributeName;
					} else {
						this.strictFail("Invalid attribute name");
					}

					continue;
				}

				case State.AttributeValueUnquoted: {
					if (!isAttributeValueEnd(character)) {
						if (character === "&") {
							this.state = State.AttributeValueEntityUnquoted;
						} else {
							this.attribute.value += character;
						}
						continue;
					}

					this.processAttribute();

					if (character === ">") {
						this.processOpenTag();
					} else {
						this.state = State.Attribute;
					}

					continue;
				}

				case State.CloseTag: {
					if (!this.tagName) {
						if (isWhitespace(character)) {
							continue;
						} else if (!isNameStartCharacter.test(character)) {
							if (this.script) {
								this.script += `</${character}`;
								this.state = State.Script;
							} else {
								this.strictFail("Invalid tagname in closing tag.");
							}
						} else {
							this.tagName = character;
						}
					} else if (character === ">") {
						this.processCloseTag();
					} else if (isNameCharacter.test(character)) {
						this.tagName += character;
					} else if (this.script) {
						this.script += `</${this.tagName}${character}`;
						this.tagName = "";
						this.state = State.Script;
					} else {
						if (!isWhitespace(character)) {
							this.strictFail("Invalid tagname in closing tag");
						}
						this.state = State.CloseTagSawWhitespace;
					}
					continue;
				}

				case State.CloseTagSawWhitespace: {
					if (isWhitespace(character)) {
						continue;
					}

					if (character === ">") {
						this.processCloseTag();
					} else {
						this.strictFail("Invalid characters in closing tag");
					}

					continue;
				}

				case State.AttributeValueEntityQuoted:
				case State.AttributeValueEntityUnquoted:
				case State.TextEntity: {
					var returnState: State;
					var buffer: "attributeValue" | "textNode";

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

					if (character === ";") {
						const parsedEntity = this.parseEntity();

						if (
							this.options.unparsedEntities &&
							!Object.values(XML_PREDEFINED_ENTITIES).includes(parsedEntity)
						) {
							this.entity = "";
							this.state = returnState;
							this.write(parsedEntity);
						} else {
							this[buffer] += parsedEntity;
							this.entity = "";
							this.state = returnState;
						}
					} else if (
						(this.entity.length ? entityBody : entityStart).test(character)
					) {
						this.entity += character;
					} else {
						this.strictFail("Invalid character in entity name");
						this[buffer] += `&${this.entity}${character}`;
						this.entity = "";
						this.state = returnState;
					}

					continue;
				}

				default: {
					throw new Error(`Unknown state: ${this.state}`);
				}
			}
		} // while

		if (this.position >= this.bufferCheckPosition) {
			this.checkBufferLength();
		}

		return this;
	}
}
