import { bench, group, run } from "mitata";

const Ascii = {
	Ampersand: 38,
	DoubleQuote: 34,
};

// --- Test Data ---
// Note: We add a trailing quote to simulate hitting the boundary
const shortString = 'id"';
const mediumString =
	'class="container d-flex justify-content-center align-items-center"'.repeat(
		2,
	) + '"';
const longString =
	'style="color: red; background: blue; padding: 10px; margin: 10px; border: 1px solid black;"'.repeat(
		50,
	) + '"';

// --- Approach 1: Bulk Scan ---
function bulkScan(chunk: string) {
	let i = 0;
	let value = "";
	const quote = Ascii.DoubleQuote;

	while (i < chunk.length) {
		let char = chunk[i];
		let charCode = chunk.charCodeAt(i);
		i++;

		const startIndex = i - 1;

		// Scan forward quickly
		while (char && charCode !== quote && charCode !== Ascii.Ampersand) {
			char = chunk[i++];
			if (char) {
				charCode = chunk.charCodeAt(i - 1);
			}
		}

		// Add the whole chunk at once
		value += chunk.substring(startIndex, i - 1);

		if (charCode === Ascii.Ampersand) {
			continue; // Emulate jumping to entity state
		}

		if (charCode === quote) {
			break; // Emulate closing the attribute
		}
	}
	return value;
}

// --- Approach 2: Char by Char ---
function charByChar(chunk: string) {
	let i = 0;
	let value = "";
	const quote = Ascii.DoubleQuote;

	while (i < chunk.length) {
		const char = chunk[i];
		const charCode = chunk.charCodeAt(i);
		i++;

		if (charCode !== quote) {
			if (charCode === Ascii.Ampersand) {
				continue; // Emulate jumping to entity state
			}
			value += char;
			continue;
		}

		// Matching quote encountered
		break;
	}
	return value;
}

// --- Benchmarks ---

group("Short String (3 chars)", () => {
	bench("Bulk Scan", () => bulkScan(shortString));
	bench("Char by Char", () => charByChar(shortString));
});

group("Medium String (~130 chars)", () => {
	bench("Bulk Scan", () => bulkScan(mediumString));
	bench("Char by Char", () => charByChar(mediumString));
});

group("Long String (~4500 chars)", () => {
	bench("Bulk Scan", () => bulkScan(longString));
	bench("Char by Char", () => charByChar(longString));
});

// Run the benchmark
await run();
