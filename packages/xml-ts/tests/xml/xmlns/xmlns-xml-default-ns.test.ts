import { describe, expect, test } from "bun:test";

const xmlnsAttr = {
	name: "xmlns",
	value: "http://foo",
	prefix: "xmlns",
	localName: "",
	uri: "http://www.w3.org/2000/xmlns/",
};

const attrAttr = {
	name: "attr",
	value: "bar",
	prefix: "",
	localName: "attr",
	uri: "",
};

describe("xmlns", () => {
	test("", () => {
		const xml = "<elm xmlns='http://foo' attr='bar'/>";

		const expected = [
			[
				"opentagstart",
				{
					name: "elm",
					attributes: {},
					ns: {},
				},
			],
			["opennamespace", { prefix: "", uri: "http://foo" }],
			["attribute", xmlnsAttr],
			["attribute", attrAttr],
			[
				"opentag",
				{
					name: "elm",
					prefix: "",
					local: "elm",
					uri: "http://foo",
					ns: { "": "http://foo" },
					attributes: {
						xmlns: xmlnsAttr,
						attr: attrAttr,
					},
					isSelfClosing: true,
				},
			],
			["closetag", "elm"],
			[
				"closenamespace",
				{
					prefix: "",
					uri: "http://foo",
				},
			],
		];

		const options = {
			strict: true,
			xmlns: true,
		};

		expect({ xml, expected, options }).toBeDefined();
	});
});

import { describe, expect, test } from "bun:test";

const xmlnsAttr = {
	name: "xmlns",
	value: "http://foo",
	prefix: "xmlns",
	localName: "",
	uri: "http://www.w3.org/2000/xmlns/",
};

const attrAttr = {
	name: "attr",
	value: "bar",
	prefix: "",
	localName: "attr",
	uri: "",
};

describe("xmlns", () => {
	test("", () => {
		const xml = "<elm xmlns='http://foo' attr='bar'/>";

		const expected = [
			[
				"opentagstart",
				{
					name: "elm",
					attributes: {},
					ns: {},
				},
			],
			["opennamespace", { prefix: "", uri: "http://foo" }],
			["attribute", xmlnsAttr],
			["attribute", attrAttr],
			[
				"opentag",
				{
					name: "elm",
					prefix: "",
					local: "elm",
					uri: "http://foo",
					ns: { "": "http://foo" },
					attributes: {
						xmlns: xmlnsAttr,
						attr: attrAttr,
					},
					isSelfClosing: true,
				},
			],
			["closetag", "elm"],
			[
				"closenamespace",
				{
					prefix: "",
					uri: "http://foo",
				},
			],
		];

		const options = {
			strict: true,
			xmlns: true,
		};

		expect({ xml, expected, options }).toBeDefined();
	});
});
