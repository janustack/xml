// this really needs to be replaced with character classes.
// XML allows all manner of ridiculous numbers and digits.
var CDATA = "[CDATA[";
var DOCTYPE = "DOCTYPE";
var XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace";
var XMLNS_NAMESPACE = "http://www.w3.org/2000/xmlns/";
var rootNS = { xml: XML_NAMESPACE, xmlns: XMLNS_NAMESPACE };

var isNameStartChar =
	/[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/;

var isNameChar =
	/[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040.\d-]/;

var entityStart =
	/[#:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/;
var entityBody =
	/[#:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040.\d-]/;

function isWhitespace(c: string): boolean {
	return c === " " || c === "\n" || c === "\r" || c === "\t";
}

function isQuote(c: string): boolean {
	return c === '"' || c === "'";
}

function isAttributeEnd(c: string): boolean {
	return c === ">" || isWhitespace(c);
}

function isMatch(regex: RegExp, c: string): boolean {
	return regex.test(c);
}

function notMatch(regex: RegExp, c: string): boolean {
	return !isMatch(regex, c);
}

function parseQName(name: string, attribute?: boolean) {
		var i = name.indexOf(":");
		var qualifiedName = i < 0 ? ["", name] : name.split(":");
		var prefix = qualifiedName[0];
		var localName = qualifiedName[1];

		// <x "xmlns"="http://foo">
		if (attribute && name === "xmlns") {
			prefix = "xmlns";
			localName = "";
		}

		return { prefix: prefix, localName: localName };
	}

var MAX_BUFFER_LENGTH = 64 * 1024;

var XML_PREDEFINED_ENTITIES = {
	amp: "&",
	gt: ">",
	lt: "<",
	quot: '"',
	apos: "'",
};

var HTML_NAMED_CHARACTER_ENTITIES = {
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
};

Object.keys(sax.ENTITIES).forEach((key) => {
	var e = sax.ENTITIES[key];
	var s = typeof e === "number" ? String.fromCharCode(e) : e;
	sax.ENTITIES[key] = s;
});

var buffers = [
	"comment",
	"sgmlDecl",
	"textNode",
	"tagName",
	"doctype",
	"procInstName",
	"procInstBody",
	"entity",
	"attributeName",
	"attributeValue",
	"cdata",
	"script",
];

var EVENTS = [
	"text",
	"processinginstruction",
	"sgmldeclaration",
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
];

enum State {
	BEGIN, // leading byte order mark or whitespace
	BEGIN_WHITESPACE, // leading whitespace
	TEXT, // general stuff
	TextEntity, // &amp and such.
	OpenWaka, // <
	SGML_DECL, // <!BLARG
	SGML_DECL_QUOTED, // <!BLARG foo "bar
	DOCTYPE, // <!DOCTYPE
	DOCTYPE_QUOTED, // <!DOCTYPE "//blah
	DOCTYPE_DTD, // <!DOCTYPE "//blah" [ ...
	DOCTYPE_DTD_QUOTED, // <!DOCTYPE "//blah" [ "foo
	COMMENT_STARTING, // <!-
	COMMENT, // <!--
	COMMENT_ENDING, // <!-- blah -
	COMMENT_ENDED, // <!-- blah --
	CDATA, // <![CDATA[ something
	CDATA_ENDING, // ]
	CDATA_ENDING_2, // ]]
	PROCESSING_INSTRUCTION, // <?hi
	PROCESSING_INSTRUCTION_BODY, // <?hi there
	PROCESSING_INSTRUCTION_ENDING, // <?hi "there" ?
	OPEN_TAG, // <strong
	OPEN_TAG_SLASH, // <strong /
	ATTRIBUTE, // <a
	ATTRIBUTE_NAME, // <a foo
	ATTRIBUTE_NAME_SAW_WHITESPACE, // <a foo _
	ATTRIBUTE_VALUE, // <a foo=
	ATTRIBUTE_VALUE_QUOTED, // <a foo="bar
	ATTRIBUTE_VALUE_CLOSED, // <a foo="bar"
	ATTRIBUTE_VALUE_UNQUOTED, // <a foo=bar
	ATTRIBUTE_VALUE_ENTITY_Q, // <foo bar="&quot;"
	ATTRIBUTE_VALUE_ENTITY_U, // <foo bar=&quot
	CLOSE_TAG, // </a
	CLOSE_TAG_SAW_WHITESPACE, // </a   >
	SCRIPT, // <script> ...
	SCRIPT_ENDING, // <script> ... <
}

export class SAXParser {

    constructor(options = {}) {
        this.clearBuffers();
        this.quote = this.c = "";
        this.bufferCheckPosition = MAX_BUFFER_LENGTH;
        this.options = options || {};
        this.options.lowercase = this.options.lowercase || this.options.lowercasetags;
        this.looseCase = this.options.lowercase ? "toLowerCase" : "toUpperCase";
        this.tagStack = [];
        this.closed = this.closedRoot = this.sawRoot = false;
        this.tag = this.error = null;
        this.strict = !!strict;
        this.noscript = !!(strict || this.options.noscript);
        this.state = State.BEGIN;
        this.strictEntities = this.options.strictEntities;
        this.entities = this.strictEntities
            ? Object.create(XML_PREDEFINED_ENTITIES)
            : Object.create(HTML_NAMED_CHARACTER_ENTITIES);
        this.attributeList = [];

        // namespaces form a prototype chain.
        // it always points at the current tag,
        // which protos to its parent tag.
        if (this.options.xmlns) {
            this.ns = Object.create(rootNS);
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
		var maxAllowed = Math.max(MAX_BUFFER_LENGTH, 10);
    var maxActual = 0;

		for (var i = 0, l = buffers.length; i < l; i++) {
			var len = this[buffers[i]].length;
			if (len > maxAllowed) {
				// Text/cdata nodes can get big, and since they're buffered,
				// we can get here under normal conditions.
				// Avoid issues by emitting the text node now,
				// so at least it won't get any bigger.
				switch (buffers[i]) {
					case "textNode":
						this.closeText();
						break;

					case "cdata":
						this.emitNode("oncdata", this.cdata);
						this.cdata = "";
						break;

					case "script":
						this.emitNode("onscript", this.script);
						this.script = "";
						break;

					default:
						this.error("Max buffer length exceeded: " + buffers[i]);
				}
			}
			maxActual = Math.max(maxActual, len);
		}
		// schedule the next check for the earliest possible buffer overrun.
		var m = MAX_BUFFER_LENGTH - maxActual;
		this.bufferCheckPosition = m + this.position;
	}

	function clearBuffers(): void {
		for (var i = 0, l = buffers.length; i < l; i++) {
			this[buffers[i]] = "";
		}
	}

	function flushBuffers(): void {
		this.closeText();
		if (this.cdata !== "") {
			this.emitNode("oncdata", this.cdata);
			this.cdata = "";
    }

		if (this.script !== "") {
			this.emitNode("onscript", this.script);
			this.script = "";
		}
	}

	private emit(event, data): void {
		this[event] && this[event](data);
	}

	private emitNode(nodeType, data): void {
		if (this.textNode) this.closeText();
		this.emit(nodeType, data);
	}

	private flushText(): void {
        this.textNode = applyTextOptions(this.options, this.textNode);

    if (this.textNode) this.emit("onText", this.textNode);

		this.textNode = "";
	}

	function applyTextOptions(opt, text: string): string {
		if (options.trim) text = text.trim();
		if (options.normalize) text = text.replace(/\s+/g, " ");
		return text;
	}

	function error(er): this {
		this.flushText();
		if (this.trackPosition) {
			er +=
				"\nLine: " +
				this.line +
				"\nColumn: " +
				this.column +
				"\nChar: " +
				this.c;
		}
		er = new Error(er);
		this.error = er;
		this.emit("onError", er);
		return this;
	}

	public end(): this {
		if (this.sawRoot && !this.closedRoot)
			this.strictFail("Unclosed root tag");
		if (
			this.state !== State.BEGIN &&
			this.state !== State.BEGIN_WHITESPACE &&
			this.state !== State.TEXT
		) {
			this.error("Unexpected end");
		}
		this.closeText();
		this.c = "";
		this.closed = true;
		this.emit("onend");
		SAXParser.call(this.strict, this.options);
		return this;
	}

	private strictFail(message): void {
		if (typeof this !== "object" || !(this instanceof SAXParser)) {
			throw new Error("bad call to strictFail");
        }

		if (this.strict) {
			this.error(message);
		}
	}

	private newTag(): void {
		if (!this.strict) this.tagName = this.tagName[this.looseCase]();
		var parent = this.tagStack[this.tagStack.length - 1] || this;
		var tag = (this.tag = { name: this.tagName, attributes: {} });

		// will be overridden if tag contails an xmlns="foo" or xmlns:foo="bar"
		if (this.options.xmlns) {
			tag.ns = parent.ns;
		}
		this.attributeList.length = 0;
		this.emitNode("onOpenTagStart", tag);
	}

	private processAttribute(): void {
		if (!this.strict) {
			this.attributeName = this.attributeName[this.looseCase]();
		}

		if (
			this.attributeList.indexOf(this.attributeName) !== -1 ||
			Object.hasOwn(this.tag.attributes, this.attributeName)
		) {
			this.attributeName = this.attributeValue = "";
			return;
		}

		if (this.options.xmlns) {
			var qn = parseQName(this.attributeName, true);
			var prefix = qn.prefix;
			var localName = qn.localName;

			if (prefix === "xmlns") {
				// namespace binding attribute. push the binding into scope
				if (localName === "xml" && this.attributeValue !== XML_NAMESPACE) {
					this.strictFail(
						"xml: prefix must be bound to " +
							XML_NAMESPACE +
							"\n" +
							"Actual: " +
							this.attributeValue,
					);
				} else if (
					localName === "xmlns" &&
					this.attributeValue !== XMLNS_NAMESPACE
				) {
					this.strictFail(
						"xmlns: prefix must be bound to " +
							XMLNS_NAMESPACE +
							"\n" +
							"Actual: " +
							this.attributeValue,
					);
				} else {
					var tag = this.tag;
					var parentNs = this.tagStack[this.tagStack.length - 1] || this;

          if (tag.ns === parentNs.ns) {
						tag.ns = Object.create(parentNs.ns);
          }

					tag.ns[localName] = this.attributeValue;
				}
			}

			// defer onattribute events until all attributes have been seen
			// so any new bindings can take effect. preserve attribute order
			// so deferred events can be emitted in document order
			this.attributeList.push([this.attributeName, this.attributeValue]);
		} else {
			// in non-xmlns mode, we can emit the event right away
			this.tag.attributes[this.attributeName] = this.attributeValue;
			this.emitNode("onattribute", {
				name: this.attributeName,
				value: this.attributeValue,
			});
		}

		this.attributeName = this.attributeValue = "";
	}

	private processOpenTag(selfClosing): void {
		if (this.options.xmlns) {
			// emit namespace binding events
			var tag = this.tag;
      var qName = parseQName(this.tagName, false);

			tag.prefix = qName.prefix;
			tag.localName = qName.localName;
			tag.uri = tag.ns[qName.prefix] || "";

			if (tag.prefix && !tag.uri) {
				this.strictFail(
					"Unbound namespace prefix: " + JSON.stringify(this.tagName),
				);
				tag.uri = qName.prefix;
			}

      var parentNs = this.tagStack[this.tagStack.length - 1] || this;

			if (tag.ns && parentNs.ns !== tag.ns) {
				Object.keys(tag.ns).forEach((prefix) => {
					this.emitNode("onOpenNamespace", {
						prefix,
						uri: tag.ns[prefix],
					});
				});
			}

			// handle deferred onattribute events
			// Note: do not apply default ns to attributes:
			//   http://www.w3.org/TR/REC-xml-names/#defaulting
			for (var i = 0, l = this.attributeList.length; i < l; i++) {
        var nv = this.attributeList[i];

				var name = nv[0];
        var value = nv[1];

				var qualifiedName = parseQName(name, true);
        var prefix = qualifiedName.prefix;
        var localName = qualifiedName.localName;

        var uri = prefix === "" ? "" : tag.ns[prefix] || "";

				var a = {
					name: name,
					value: value,
					prefix: prefix,
					localName: localName,
					uri: uri,
				};

				// if there's any attributes with an undefined namespace,
				// then fail on them now.
				if (prefix && prefix !== "xmlns" && !uri) {
					this.strictFail("Unbound namespace prefix: " + JSON.stringify(prefix));
					a.uri = prefix;
        }

				this.tag.attributes[name] = a;
				this.emitNode("onattribute", a);
      }

			this.attributeList.length = 0;
		}

		this.tag.isSelfClosing = !!selfClosing;
		this.hasSeenRoot = true;
		this.tagStack.push(this.tag);
		this.emitNode("onOpenTag", this.tag);
		if (!selfClosing) {
			// special case for <script> in non-strict mode.
			if (!this.noscript && this.tagName.toLowerCase() === "script") {
				this.state = State.SCRIPT;
			} else {
				this.state = State.TEXT;
			}
			this.tag = null;
			this.tagName = "";
    }

    this.attributeName = "";
    this.attributeValue = "";
		this.attributeList.length = 0;
	}

	private processCloseTag(): void {
		if (!this.tagName) {
			this.strictFail("Weird empty close tag.");
			this.textNode += "</>";
			this.state = State.TEXT;
			return;
		}

		if (this.script) {
			if (this.tagName !== "script") {
				this.script += "</" + this.tagName + ">";
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

		if (!this.options.strict) {
			tagName = tagName[this.looseCase]();
    }

    var closeTo = tagName;

		while (index--) {
      var close = this.tagStack[index];

			if (close.name !== closeTo) {
				// fail the first time in strict mode
				this.strictFail("Unexpected close tag");
			} else {
				break;
			}
    }

		if (index < 0) {
			this.strictFail("Unmatched closing tag: " + this.tagName);
			this.textNode += "</" + this.tagName + ">";
			this.state = State.TEXT;
			return;
		}

    this.tagName = tagName;

		var s = this.tagStack.length;
		while (s-- > index) {
			var tag = (this.tag = this.tagStack.pop());
			this.tagName = this.tag.name;
			this.emitNode("onCloseTag", this.tagName);

      var parentNs = this.tagStack[this.tagStack.length - 1] || this;

			if (this.options.xmlns && tag.ns !== parentNs.ns) {
				Object.keys(tag.ns).forEach((prefix) => {
					var n = tag.ns[prefix];
					this.emitNode("onCloseNamespace", { prefix: prefix, uri: n });
				});
			}
    }

    if (index === 0) {
      this.closedRoot = true;
    }

    this.tagName = "";
    this.attributeValue = "";
    this.attributeName = "";
		this.attributeList.length = 0;
		this.state = State.Text;
	}

	private parseEntity(): string {
		var entity = this.entity;
		var entityLC = entity.toLowerCase();
		var number;
		var numStr = "";

		if (this.entities[entity]) {
			return this.entities[entity];
    }

		if (this.entities[entityLC]) {
			return this.entities[entityLC];
    }

    entity = entityLC;

		if (entity.charAt(0) === "#") {
			if (entity.charAt(1) === "x") {
				entity = entity.slice(2);
				number = Number.parseInt(entity, 16);
				numStr = number.toString(16);
			} else {
				entity = entity.slice(1);
				number = Number.parseInt(entity, 10);
				numStr = number.toString(10);
			}
    }

        entity = entity.replace(/^0+/, "");

		if (
			Number.isNaN(number) ||
			numStr.toLowerCase() !== entity ||
			number < 0 ||
			number > 0x10ffff
		) {
			this.strictFail("Invalid character entity");
			return "&" + this.entity + ";";
		}

		return String.fromCodePoint(number);
	}

	private beginWhitespace(c: string): void {
		if (c === "<") {
			this.state = State.OpenWaka;
			this.startTagPosition = this.position;
		} else if (!isWhitespace(c)) {
			// have to process this as a text node.
			// weird, but happens.
			this.strictFail("Non-whitespace before first tag.");
			this.textNode = this.c;
			this.state = State.Text;
		}
	}

	public write(chunk) {
		if (this.error) {
			throw this.error;
		}
		if (this.closed) {
			return error(
				this,
				"Cannot write after close. Assign an onready handler.",
			);
		}
		if (chunk === null) {
			return this.end();
		}
		if (typeof chunk === "object") {
			chunk = chunk.toString();
        }

		var i = 0;
        var c = "";

		while (true) {
      c = chunk.charAt(i++);

			this.c = c;

			if (!c) {
				break;
			}

			if (this.trackPosition) {
				this.position++;
				if (c === "\n") {
					this.line++;
					this.column = 0;
				} else {
					this.column++;
				}
			}

            switch (this.state) {
                case State.Begin: {
                    this.state = State.BeginWhitespace;
                    if (c === "\uFEFF") {
                        continue;
                    }
                    this.beginWhitespace(c);
                    continue;
                }

                case State.BeginWhitespace: {
                    this.beginWhitespace(c);
                    continue;
                }

                case State.Text: {
                    if (this.sawRoot && !this.closedRoot) {
                        var starti = i - 1;
                        while (c && c !== "<" && c !== "&") {
                            c = charAt(chunk, i++);
                            if (c && this.trackPosition) {
                                this.position++;
                                if (c === "\n") {
                                    this.line++;
                                    this.column = 0;
                                } else {
                                    this.column++;
                                }
                            }
                        }
                        this.textNode += chunk.substring(starti, i - 1);
                    }
                    if (c === "<" && !(this.sawRoot && this.closedRoot && !this.strict)) {
                        this.state = State.OpenWaka;
                        this.startTagPosition = this.position;
                    } else {
                        if (!isWhitespace(c) && (!this.sawRoot || this.closedRoot)) {
                            this.strictFail("Text data outside of root node.");
                        }
                        if (c === "&") {
                            this.state = State.TextEntity;
                        } else {
                            this.textNode += c;
                        }
                    }
                    continue;
            }


                case State.Script: {
                    // only non-strict
                    if (c === "<") {
                        this.state = State.ScriptEnding;
                    } else {
                        this.script += c;
                    }
                    continue;
                }

                case State.ScriptEnding: {
                    if (c === "/") {
                        this.state = State.CloseTag;
                    } else {
                        this.script += "<" + c;
                        this.state = State.Script;
                    }
                    continue;
                }



				case State.OpenWaka:
					// either a /, ?, !, or text is coming next.
					if (c === "!") {
						this.state = State.SGML_DECLARATION;
						this.sgmlDecl = "";
					} else if (isWhitespace(c)) {
						// wait for it...emitNode(this,
					} else if (isMatch(isNameStartChar, c)) {
						this.state = State.OPEN_TAG;
						this.tagName = c;
					} else if (c === "/") {
						this.state = State.CLOSE_TAG;
						this.tagName = "";
					} else if (c === "?") {
						this.state = State.ProcessingInstruction;
						this.procInstName = this.procInstBody = "";
					} else {
						this.strictFail("Unencoded <");
						// if there was some whitespace, then add that in.
						if (this.startTagPosition + 1 < this.position) {
							var pad = this.position - this.startTagPosition;
							c = new Array(pad).join(" ") + c;
						}
						this.textNode += "<" + c;
						this.state = State.TEXT;
					}
					continue;

					case S.SGML_DECL:
						if (this.sgmlDecl + c === "--") {
							this.state = S.COMMENT;
							this.comment = "";
							this.sgmlDecl = "";
							continue;
						}

						if (this.doctype && this.doctype !== true && this.sgmlDecl) {
							this.state = S.DOCTYPE_DTD;
							this.doctype += "<!" + this.sgmlDecl + c;
							this.sgmlDecl = "";
						} else if ((this.sgmlDecl + c).toUpperCase() === CDATA) {
							emitNode(this, "onopencdata");
							this.state = S.CDATA;
							this.sgmlDecl = "";
							this.cdata = "";
						} else if ((this.sgmlDecl + c).toUpperCase() === DOCTYPE) {
							this.state = S.DOCTYPE;
							if (this.doctype || this.sawRoot) {
								strictFail(this, "Inappropriately located doctype declaration");
							}
							this.doctype = "";
							this.sgmlDecl = "";
						} else if (c === ">") {
							emitNode(this, "onsgmldeclaration", this.sgmlDecl);
							this.sgmlDecl = "";
							this.state = S.TEXT;
						} else if (isQuote(c)) {
							this.state = S.SGML_DECL_QUOTED;
							this.sgmlDecl += c;
						} else {
							this.sgmlDecl += c;
						}
						continue;

                case State.SGML_DECL_QUOTED:
                    if (c === this.quote) {
                        this.state = State.SGML_DECL;
                        this.quote = "";
                    }
                    this.sgmlDecl += c;
                    continue;

                case State.DOCTYPE:
                    if (c === ">") {
                        this.state = State.TEXT;
                        this.emitNode("onDoctype", this.doctype);
                        this.doctype = true; // just remember that we saw it.
                    } else {
                        this.doctype += c;
                        if (c === "[") {
                            this.state = State.DOCTYPE_DTD;
                        } else if (isQuote(c)) {
                            this.state = State.DOCTYPE_QUOTED;
                            this.quote = c;
                        }
                    }
                    continue;

                case State.DOCTYPE_QUOTED:
                    this.doctype += c;
                    if (c === this.quote) {
                        this.quote = "";
                        this.state = State.DOCTYPE;
                    }
                    continue;

                case State.DOCTYPE_DTD:
                    if (c === "]") {
                        this.doctype += c;
                        this.state = State.DOCTYPE;
                    } else if (c === "<") {
                        this.state = State.OpenWaka;
                        this.startTagPosition = this.position;
                    } else if (isQuote(c)) {
                        this.doctype += c;
                        this.state = State.DOCTYPE_DTD_QUOTED;
                        this.quote = c;
                    } else {
                        this.doctype += c;
                    }
                    continue;

                case State.DOCTYPE_DTD_QUOTED:
                    this.doctype += c;

                    if (c === this.quote) {
                        this.state = State.DOCTYPE_DTD;
                        this.quote = "";
                    }

                    continue;

                case State.Comment:
                    if (c === "-") {
                        this.state = State.CommentEnding;
                    } else {
                        this.comment += c;
                    }
                    continue;

				case State.CommentEnding:
					if (c === "-") {
						this.state = State.CommentEnded;
						this.comment = applyTextOptions(this.options, this.comment);
						if (this.comment) {
							this.emitNode("onComment", this.comment);
						}
						this.comment = "";
					} else {
						this.comment += "-" + c;
						this.state = State.COMMENT;
					}
					continue;

				case State.CommentEnded:
					if (c !== ">") {
						this.strictFail("Malformed comment");
						// allow <!-- blah -- bloo --> in non-strict mode,
						// which is a comment of " blah -- bloo "
						this.comment += "--" + c;
						this.state = State.Comment;
					} else if (this.doctype && this.doctype !== true) {
						this.state = State.DOCTYPE_DTD;
					} else {
						this.state = State.Text;
					}
					continue;

				case State.CData:
					var starti = i - 1;
					while (c && c !== "]") {
						c = chunk.charAt(i++);
						if (c && this.trackPosition) {
							this.position++;
							if (c === "\n") {
								this.line++;
								this.column = 0;
							} else {
								this.column++;
							}
						}
					}
					this.cdata += chunk.substring(starti, i - 1);
					if (c === "]") {
						this.state = State.CDataEnding;
					}
					continue;

				case State.CDataEnding:
					if (c === "]") {
						this.state = State.CDATA_ENDING_2;
					} else {
						this.cdata += "]" + c;
						this.state = State.CDATA;
					}
					continue;

				case State.CDATA_ENDING_2:
					if (c === ">") {
						if (this.cdata) {
							this.emitNode("oncdata", this.cdata);
						}
                        this.emitNode("onCloseCdata");

						this.cdata = "";
                        this.state = S.TEXT;

					} else if (c === "]") {
						this.cdata += "]";
					} else {
						this.cdata += "]]" + c;
						this.state = State.CDATA;
					}
					continue;

                case State.ProcessingInstruction:
                    if (c === "?") {
                        this.state = State.ProcessingInstruction_ENDING;
                    } else if (isWhitespace(c)) {
                        this.state = State.ProcessingInstruction_DATA;
                    } else {
                        this.piTarget += c;
                    }
                    continue;

                case State.ProcessingInstruction_DATA:
                    if (!this.piData && isWhitespace(c)) {
                        continue;
                    } else if (c === "?") {
                        this.state = State.ProcessingInstruction_ENDING;
                    } else {
                        this.piData += c;
                    }
                    continue;

					case State.ProcessingInstruction_ENDING:
					if (c === ">") {
						this.emitNode(this, "onProcessingInstruction", {
							name: this.piTarget,
							body: this.piData,
						});
						this.procInstName = this.procInstBody = "";
						this.state = State.TEXT;
					} else {
						this.procInstBody += "?" + c;
						this.state = State.ProcessingInstruction_BODY;
					}
            continue;

				case State.OPEN_TAG:
					if (isMatch(isNameChar, c)) {
						this.tagName += c;
					} else {
						this.newTag();
						if (c === ">") {
							this.openTag();
						} else if (c === "/") {
							this.state = State.OpenTagSlash;
						} else {
							if (!isWhitespace(c)) {
								this.strictFail("Invalid character in tag name");
							}
							this.state = State.Attribute;
						}
					}
					continue;

				case State.OpenTagSlash:
					if (c === ">") {
						this.processOpenTag(true);
						this.processCloseTag();
					} else {
						this.strictFail("Forward-slash in opening tag not followed by >");
						this.state = State.Attribute;
					}
					continue;

				case State.Attribute:
					// haven't read the attribute name yet.
					if (isWhitespace(c)) {
						continue;
					} else if (c === ">") {
						this.openTag();
					} else if (c === "/") {
						this.state = State.OpenTagSlash;
					} else if (isMatch(isNameStartChar, c)) {
						this.attributeName = c;
						this.attributeValue = "";
						this.state = State.AttributeName;
					} else {
						this.strictFail("Invalid attribute name");
					}
					continue;

				case State.AttributeName:
					if (c === "=") {
						this.state = State.ATTRIBUTE_VALUE;
					} else if (c === ">") {
						this.strictFail("Attribute without value");
						this.attributeValue = this.attributeName;
						this.processAttribute();
						this.openTag();
					} else if (isWhitespace(c)) {
						this.state = State.ATTRIBUTE_NAME_SAW_WHITESPACE;
					} else if (isMatch(isNameChar, c)) {
						this.attributeName += c;
					} else {
						this.strictFail("Invalid attribute name");
					}
					continue;

				case S.ATTRIBUTE_NAME_SAW_WHITESPACE:
					if (c === "=") {
						this.state = S.ATTRIBUTE_VALUE;
					} else if (isWhitespace(c)) {
						continue;
					} else {
						this.strictFail("Attribute without value");
						this.tag.attributes[this.attributeName] = "";
						this.attributeValue = "";
						emitNode(this, "onattribute", {
							name: this.attributeName,
							value: "",
						});
						this.attributeName = "";
						if (c === ">") {
							this.openTag();
						} else if (isMatch(isNameStartChar, c)) {
							this.attributeName = c;
							this.state = State.AttribteName;
						} else {
							this.strictFail("Invalid attribute name");
							this.state = State.Attribute;
						}
					}
					continue;

				case State.ATTRIBUTE_VALUE:
					if (isWhitespace(c)) {
						continue;
					} else if (isQuote(c)) {
						this.quote = c;
						this.state = State.ATTRIBUTE_VALUE_QUOTED;
					} else {
						if (!this.options.unquotedAttributeValues) {
							this.error("Unquoted attribute value");
						}
						this.state = State.ATTRIBUTE_VALUE_UNQUOTED;
						this.attributeValue = c;
					}
					continue;

				case State.ATTRIBUTE_VALUE_QUOTED:
					if (c !== this.quote) {
						if (c === "&") {
							this.state = State.ATTRIBUTE_VALUE_ENTITY_Q;
						} else {
							this.attributeValue += c;
						}
						continue;
					}
					this.processAttribute();
					this.quote = "";
					this.state = State.ATTRIBUTE_VALUE_CLOSED;
					continue;

				case State.ATTRIBUTE_VALUE_CLOSED:
					if (isWhitespace(c)) {
						this.state = State.Attribute;
					} else if (c === ">") {
						this.openTag();
					} else if (c === "/") {
						this.state = State.OpenTagSlash;
					} else if (isMatch(isNameStartChar, c)) {
						this.strictFail("No whitespace between attributes");
						this.attributeName = c;
						this.attributeValue = "";
						this.state = State.AttributeName;
					} else {
						this.strictFail("Invalid attribute name");
					}
					continue;

				case State.ATTRIBUTE_VALUE_UNQUOTED:
					if (!isAttributeEnd(c)) {
						if (c === "&") {
							this.state = State.ATTRIBUTE_VALUE_ENTITY_U;
						} else {
							this.attributeValue += c;
						}
						continue;
					}
					this.processAttribute();
					if (c === ">") {
						this.openTag();
					} else {
						this.state = State.Attribute;
					}
					continue;

				case State.CLOSE_TAG:
					if (!this.tagName) {
						if (isWhitespace(c)) {
							continue;
						} else if (notMatch(isNameStartChar, c)) {
							if (this.script) {
								this.script += "</" + c;
								this.state = State.SCRIPT;
							} else {
								this.strictFail("Invalid tagname in closing tag.");
							}
						} else {
							this.tagName = c;
						}
					} else if (c === ">") {
						this.closeTag();
					} else if (isMatch(isNameChar, c)) {
						this.tagName += c;
					} else if (this.script) {
						this.script += "</" + this.tagName + c;
						this.tagName = "";
						this.state = State.SCRIPT;
					} else {
						if (!isWhitespace(c)) {
							this.strictFail("Invalid tagname in closing tag");
						}
						this.state = State.CLOSE_TAG_SAW_WHITESPACE;
					}
					continue;

				case State.CLOSE_TAG_SAW_WHITESPACAE:
					if (isWhitespace(c)) {
						continue;
					}
					if (c === ">") {
						this.closeTag();
					} else {
						this.strictFail("Invalid characters in closing tag");
					}
					continue;

				case State.TextEntity:
				case State.AttributeValueEntityQuoted:
				case State.AttributeValueEntityUnquoted:
					var returnState;
					var buffer;
					switch (this.state) {
						case State.TextEntity:
							returnState = State.TEXT;
							buffer = "textNode";
							break;

						case State.AttributeValueEntityQuoted:
							returnState = State.AttributeValueEntityQuoted;
							buffer = "attributeValue";
							break;

						case State.AttributeValueEntityUnquoted:
							returnState = State.AttributeValueEntityUnquoted;
							buffer = "attributeValue";
							break;
					}

					if (c === ";") {
						var parsedEntity = this.parseEntity();
						if (
							this.options.unparsedEntities &&
							!Object.values(XML_ENTITIES).includes(parsedEntity)
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
						isMatch(this.entity.length ? entityBody : entityStart, c)
					) {
						this.entity += c;
					} else {
						this.strictFail("Invalid character in entity name");
						this[buffer] += "&" + this.entity + c;
						this.entity = "";
						this.state = returnState;
					}

					continue;

				default: /* istanbul ignore next */
					throw new this.error("Unknown state: " + this.state);
			}
		} // while

		if (this.position >= this.bufferCheckPosition) {
			this.checkBufferLength();
		}
		return this;
	}
}
