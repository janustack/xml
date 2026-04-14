// ASCII control characters (codes 0–31)
export const ControlCharacter = {
	Acknowledge: 0x06, // ACK
	Backspace: 0x08, // BS
	Bell: 0x07, // BEL
	Cancel: 0x18, // CAN
	CarriageReturn: 0x0d, // CR
	DataLinkEscape: 0x10, // DLE
	Delete: 0x7f, // DEL
	EndOfMedium: 0x19, // EM
	EndOfText: 0x03, // ETX
	EndOfTransmission: 0x04, // EOT
	EndOfTransmissionBlock: 0x17, // ETB
	Enquiry: 0x05, // ENQ
	Escape: 0x1b, // ESC
	FileSeparator: 0x1c, // FS
	FormFeed: 0x0c, // FF
	GroupSeparator: 0x1d, // GS
	HorizontalTab: 0x09, // HT
	LineFeed: 0x0a, // LF
	NegativeAcknowledge: 0x15, // NAK
	Newline: 0x0a, // LF
	Null: 0x00, // NUL
	RecordSeparator: 0x1e, // RS
	ShiftIn: 0x0f, // SI
	ShiftOut: 0x0e, // SO
	StartOfHeader: 0x01, // SOH
	StartOfText: 0x02, // STX
	Substitute: 0x1a, // SUB
	Synchronize: 0x16, // SYN
	UnitSeparator: 0x1f, // US
	VerticalTab: 0x0b, // VT
} as const;

// ASCII printable characters (codes 32–126)
// Includes letters, digits, punctuation, and common symbols.
export const PrintableCharacter = {
	Space: 0x20, // [space]
	ExclamationMark: 0x21, // !
	DoubleQuote: 0x22, // "
	Number: 0x23, // #
	Dollar: 0x24, // $
	Percent: 0x25, // %
	Ampersand: 0x26, // &
	SingleQuote: 0x27, // '
	OpenParenthesis: 0x28, // (
	CloseParenthesis: 0x29, // )
	Asterisk: 0x2a, // *
	Plus: 0x2b, // +
	Comma: 0x2c, // ,
	Minus: 0x2d, // -
	Period: 0x2e, // .
	ForwardSlash: 0x2f, // /
	Zero: 0x30,
	Two: 0x32, // 2
	Three: 0x33, // 3
	Nine: 0x39,
	Colon: 0x3a, // :
	Semicolon: 0x3b, // ;
	OpenAngle: 0x3c, // <
	Equal: 0x3d, // =
	CloseAngle: 0x3e, // >
	QuestionMark: 0x3f, // ?
	At: 0x40, // @
	UppercaseA: 0x41,
	UppercaseZ: 0x5a,
	OpenBracket: 0x5b, // [
	Backslash: 0x5c, // \
	CloseBracket: 0x5d, // ]
	Caret: 0x5e, // ^
	Underscore: 0x5f, // _
	GraveAccent: 0x60, // `
	LowercaseA: 0x61,
	LowercaseZ: 0x7a,
	OpenBrace: 0x7b, // {
	VerticalBar: 0x7c, // |
	CloseBrace: 0x7d, // }
	Tilde: 0x7e, // ~
} as const;

export const Ascii = {
	...ControlCharacter,
	...PrintableCharacter,
} as const;
