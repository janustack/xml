import { dts } from "bun-plugin-dtsx";

await Bun.$`rm -rf dist`;

const result = await Bun.build({
	entrypoints: ["src/main.ts"],
	metafile: "meta.json",
	plugins: [dts()],
	target: "browser",
	footer: "// Built with red eyes by ACY in Florida",
	minify: true,
	outdir: "dist",
});

if (result.metafile) {
	for (const [path, meta] of Object.entries(result.metafile.outputs)) {
		const megabytes = meta.bytes / 1_000_000;
		Bun.stdout.write(`${path}: ${megabytes.toFixed(3)} mb`);
	}
}
