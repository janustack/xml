import { describe, expect, test } from "bun:test";

describe("xmlns", () => {
	test.each([
		{
			name: "xmlns-xml-default-redefine",
			xml: "<xml:root xmlns:xml='ERROR'/>",
			expect: [
				[
					"openTagStart",
					{
						name: "xml:root",
						attributes: {},
						ns: {},
					},
				],
				[
					"error",
					"xml: prefix must be bound to http://www.w3.org/XML/1998/namespace\n" +
						"Actual: ERROR\n" +
						"Line: 0\nColumn: 27\nChar: '",
				],
				[
					"attribute",
					{
						name: "xmlns:xml",
						localName: "xml",
						prefix: "xmlns",
						uri: "http://www.w3.org/2000/xmlns/",
						value: "ERROR",
					},
				],
				[
					"openTag",
					{
						name: "xml:root",
						uri: "http://www.w3.org/XML/1998/namespace",
						prefix: "xml",
						localName: "root",
						attributes: {
							"xmlns:xml": {
								name: "xmlns:xml",
								local: "xml",
								prefix: "xmlns",
								uri: "http://www.w3.org/2000/xmlns/",
								value: "ERROR",
							},
						},
						ns: {},
						isSelfClosing: true,
					},
				],
				["closeTag", "xml:root"],
			],
			options: { strict: true, xmlns: true },
		},
		{
			name: "xmlns-xml-default-prefix-attribute",
			xml: "<root xml:lang='en'/>",
			expect: [
				[
					"openTagStart",
					{
						name: "root",
						attributes: {},
						ns: {},
					},
				],
				[
					"attribute",
					{
						name: "xml:lang",
						localName: "lang",
						prefix: "xml",
						uri: "http://www.w3.org/XML/1998/namespace",
						value: "en",
					},
				],
				[
					"openTag",
					{
						name: "root",
						uri: "",
						prefix: "",
						localName: "root",
						attributes: {
							"xml:lang": {
								name: "xml:lang",
								local: "lang",
								prefix: "xml",
								uri: "http://www.w3.org/XML/1998/namespace",
								value: "en",
							},
						},
						ns: {},
						isSelfClosing: true,
					},
				],
				["closeTag", "root"],
			],
			options: { strict: true, xmlns: true },
		},
		{
			name: "xmlns-xml-default-prefix",
			xml: "<xml:root/>",
			expect: [
				[
					"openTagStart",
					{
						name: "xml:root",
						attributes: {},
						ns: {},
					},
				],
				[
					"openTag",
					{
						name: "xml:root",
						uri: "http://www.w3.org/XML/1998/namespace",
						prefix: "xml",
						localName: "root",
						attributes: {},
						ns: {},
						isSelfClosing: true,
					},
				],
				["closeTag", "xml:root"],
			],
			options: { strict: true, xmlns: true },
		},
	])("$name", (data) => {});
});
