import { build } from "esbuild";
import { copy } from "esbuild-plugin-copy";
import path from "path";

const rootDir = new URL("..", import.meta.url).pathname;

await build({
    entryPoints: ["src/webview/frontend/App.tsx"],
    bundle: true,
    platform: "browser",
    format: "iife",
    target: ["es6"],
    sourcemap: false,
    minify: true,
    outfile: "public/scripts/frontend.module.js",
    loader: {
        ".ts": "ts",
        ".tsx": "tsx",
    },
    resolveExtensions: [".tsx", ".ts", ".js"],
    external: ["vscode"],
    plugins: [
        copy({
            resolveFrom: "cwd",
            assets: {
                from: [
                    "node_modules/@vscode/codicons/dist/codicon.css",
                    "node_modules/@vscode/codicons/dist/codicon.ttf",
                ],
                to: ["public/styles"],
            },
            watch: false,
        }),
    ],
});
