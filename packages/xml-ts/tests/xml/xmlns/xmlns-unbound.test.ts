import { describe, expect, test } from "bun:test";

describe("", () => {
	test.each([
		{
			name: "strict",
			xml:
				"<root>" +
				'<plain attr="normal" />' +
				'<ns1 xmlns="uri:default">' +
				'<plain attr="normal"/>' +
				"</ns1>" +
				'<ns2 xmlns:a="uri:nsa">' +
				'<plain attr="normal"/>' +
				'<a:ns a:attr="namespaced"/>' +
				"</ns2>" +
				"</root>",
			options: {
				strict: true,
				xmlns: true,
			},
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
					"openTag",
					{
						name: "root",
						prefix: "",
						localName: "root",
						uri: "",
						attributes: {},
						ns: {},
						isSelfClosing: false,
					},
				],
				[
					"openTagStart",
					{
						name: "plain",
						attributes: {},
						ns: {},
					},
				],
				[
					"attribute",
					{
						name: "attr",
						value: "normal",
						prefix: "",
						localName: "attr",
						uri: "",
					},
				],
				[
					"openTag",
					{
						name: "plain",
						prefix: "",
						localName: "plain",
						uri: "",
						attributes: {
							attr: {
								name: "attr",
								value: "normal",
								prefix: "",
								localName: "attr",
								uri: "",
							},
						},
						ns: {},
						isSelfClosing: true,
					},
				],
				["closeTag", "plain"],
				[
					"openTagStart",
					{
						name: "ns1",
						attributes: {},
						ns: {},
					},
				],
				[
					"openNamespace",
					{
						prefix: "",
						uri: "uri:default",
					},
				],
				[
					"attribute",
					{
						name: "xmlns",
						value: "uri:default",
						prefix: "xmlns",
						localName: "",
						uri: "http://www.w3.org/2000/xmlns/",
					},
				],
				[
					"openTag",
					{
						name: "ns1",
						prefix: "",
						localName: "ns1",
						uri: "uri:default",
						attributes: {
							xmlns: {
								name: "xmlns",
								value: "uri:default",
								prefix: "xmlns",
								localName: "",
								uri: "http://www.w3.org/2000/xmlns/",
							},
						},
						ns: {
							"": "uri:default",
						},
						isSelfClosing: false,
					},
				],
				[
					"openTagStart",
					{
						name: "plain",
						ns: {
							"": "uri:default",
						},
						attributes: {},
					},
				],
				[
					"attribute",
					{
						name: "attr",
						value: "normal",
						prefix: "",
						localName: "attr",
						uri: "",
					},
				],
				[
					"openTag",
					{
						name: "plain",
						prefix: "",
						localName: "plain",
						uri: "uri:default",
						ns: {
							"": "uri:default",
						},
						attributes: {
							attr: {
								name: "attr",
								value: "normal",
								prefix: "",
								localName: "attr",
								uri: "",
							},
						},
						isSelfClosing: true,
					},
				],
				["closeTag", "plain"],
				["closeTag", "ns1"],
				[
					"closeNamespace",
					{
						prefix: "",
						uri: "uri:default",
					},
				],
				[
					"openTagStart",
					{
						name: "ns2",
						attributes: {},
						ns: {},
					},
				],
				[
					"openNamespace",
					{
						prefix: "a",
						uri: "uri:nsa",
					},
				],
				[
					"attribute",
					{
						name: "xmlns:a",
						value: "uri:nsa",
						prefix: "xmlns",
						localName: "a",
						uri: "http://www.w3.org/2000/xmlns/",
					},
				],
				[
					"openTag",
					{
						name: "ns2",
						prefix: "",
						localName: "ns2",
						uri: "",
						attributes: {
							"xmlns:a": {
								name: "xmlns:a",
								value: "uri:nsa",
								prefix: "xmlns",
								localName: "a",
								uri: "http://www.w3.org/2000/xmlns/",
							},
						},
						ns: {
							a: "uri:nsa",
						},
						isSelfClosing: false,
					},
				],
				[
					"openTagStart",
					{
						name: "plain",
						attributes: {},
						ns: {
							a: "uri:nsa",
						},
					},
				],
				[
					"attribute",
					{
						name: "attr",
						value: "normal",
						prefix: "",
						localName: "attr",
						uri: "",
					},
				],
				[
					"openTag",
					{
						name: "plain",
						prefix: "",
						localName: "plain",
						uri: "",
						attributes: {
							attr: {
								name: "attr",
								value: "normal",
								prefix: "",
								localName: "attr",
								uri: "",
							},
						},
						ns: {
							a: "uri:nsa",
						},
						isSelfClosing: true,
					},
				],
				["closeTag", "plain"],
				[
					"openTagStart",
					{
						name: "a:ns",
						attributes: {},
						ns: { a: "uri:nsa" },
					},
				],
				[
					"attribute",
					{
						name: "a:attr",
						value: "namespaced",
						prefix: "a",
						localName: "attr",
						uri: "uri:nsa",
					},
				],
				[
					"openTag",
					{
						name: "a:ns",
						prefix: "a",
						localName: "ns",
						uri: "uri:nsa",
						attributes: {
							"a:attr": {
								name: "a:attr",
								value: "namespaced",
								prefix: "a",
								localName: "attr",
								uri: "uri:nsa",
							},
						},
						ns: { a: "uri:nsa" },
						isSelfClosing: true,
					},
				],
				["closeTag", "a:ns"],
				["closeTag", "ns2"],
				[
					"closeNamespace",
					{
						prefix: "a",
						uri: "uri:nsa",
					},
				],
				["closeTag", "root"],
			],
		},
		{
			name: "unbound element",
			xml: "<unbound:root/>",
			options: { strict: true, xmlns: true },
			expect: [
				[
					"openTagStart",
					{
						name: "unbound:root",
						attributes: {},
						ns: {},
					},
				],
				[
					"error",
					'Unbound namespace prefix: "unbound:root"\nLine: 0\nColumn: 15\nChar: >',
				],
				[
					"openTag",
					{
						name: "unbound:root",
						uri: "unbound",
						prefix: "unbound",
						localName: "root",
						attributes: {},
						ns: {},
						isSelfClosing: true,
					},
				],
				["closetag", "unbound:root"],
			],
		},
		{
			name: "",
			xml: `<unbound:root xmlns:unbound="someuri"/>`,
			optioins: {
				strict: true,
				xmlns: true,
			},
			expect: [
				[
					"openTagStart",
					{
						name: "unbound:root",
						attributes: {},
						ns: {},
					},
				],
				[
					"opennamespace",
					{
						prefix: "unbound",
						uri: "someuri",
					},
				],
				[
					"attribute",
					{
						name: "xmlns:unbound",
						value: "someuri",
						prefix: "xmlns",
						localName: "unbound",
						uri: "http://www.w3.org/2000/xmlns/",
					},
				],
				[
					"openTag",
					{
						name: "unbound:root",
						uri: "someuri",
						prefix: "unbound",
						localName: "root",
						attributes: {
							"xmlns:unbound": {
								name: "xmlns:unbound",
								value: "someuri",
								prefix: "xmlns",
								localName: "unbound",
								uri: "http://www.w3.org/2000/xmlns/",
							},
						},
						ns: {
							unbound: "someuri",
						},
						isSelfClosing: true,
					},
				],
				["closeTag", "unbound:root"],
				[
					"closeNamespace",
					{
						prefix: "unbound",
						uri: "someuri",
					},
				],
			],
		},
		{
			name: "unbound",
			xml: "<root unbound:attr='value'/>",
			options: { strict: true, xmlns: true },
			expect: [
				[
					"opentagstart",
					{
						name: "root",
						attributes: {},
						ns: {},
					},
				],
				[
					"error",
					'Unbound namespace prefix: "unbound"\nLine: 0\nColumn: 28\nChar: >',
				],
				[
					"attribute",
					{
						name: "unbound:attr",
						value: "value",
						uri: "unbound",
						prefix: "unbound",
						localName: "attr",
					},
				],
				[
					"opentag",
					{
						name: "root",
						uri: "",
						prefix: "",
						localName: "root",
						attributes: {
							"unbound:attr": {
								name: "unbound:attr",
								value: "value",
								uri: "unbound",
								prefix: "unbound",
								localName: "attr",
							},
						},
						ns: {},
						isSelfClosing: true,
					},
				],
				["closeTag", "root"],
			],
		},
	]);
});
