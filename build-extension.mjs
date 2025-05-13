import { build } from "esbuild";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

await build({
    entryPoints: ["src/extension.ts"],
    bundle: true,
    platform: "node",
    target: "node20",
    outfile: "dist/extension.js",
    sourcemap: false,
    minify: true,

    external: ["vscode", "markdown-language-features"],

    resolveExtensions: [".ts", ".js"],
    alias: {
        "@": path.resolve(__dirname, "../src"),
    },

    logLevel: "info",
});
