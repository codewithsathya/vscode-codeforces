import * as os from "os";
import * as path from "path";

import hljs from "highlight.js";
import MarkdownIt from "markdown-it";
import * as vscode from "vscode";
import * as fs from "fs-extra";

import { codeforcesChannel } from "../codeforcesChannel";

import { MarkdownConfiguration } from "./markdownConfiguration";

class MarkdownEngine implements vscode.Disposable {
    private engine: MarkdownIt | undefined;
    private config: MarkdownConfiguration | undefined;
    private listener: vscode.Disposable;

    public constructor() {
        this.reload();
        this.listener = vscode.workspace.onDidChangeConfiguration(
            (event: vscode.ConfigurationChangeEvent) => {
                if (event.affectsConfiguration("markdown")) {
                    this.reload();
                }
            },
            this,
        );
    }

    public get localResourceRoots(): vscode.Uri[] {
        if (!this.config) {
            return [];
        }
        return [vscode.Uri.file(path.join(this.config.extRoot, "media"))];
    }

    public dispose(): void {
        this.listener.dispose();
    }

    public reload(): void {
        this.engine = this.initEngine();
        this.config = new MarkdownConfiguration();
    }

    public render(md: string, env?: any): string {
        if (!this.engine) {
            return "";
        }
        return this.engine.render(md, env);
    }

    public getStyles(webview: vscode.Webview): string {
        return [this.getBuiltinStyles(webview), this.getSettingsStyles()].join(
            os.EOL,
        );
    }

    private getBuiltinStyles(webview: vscode.Webview): string {
        const mdExt = vscode.extensions.getExtension(
            "vscode.markdown-language-features",
        );
        if (!mdExt) {
            codeforcesChannel.appendLine(
                "[Error] markdown-language-features extension not found.",
            );
            return "";
        }

        const extRoot = mdExt.extensionPath;
        let styles: vscode.Uri[] = [];

        try {
            const packageJson = fs.readJSONSync(
                path.join(extRoot, "package.json"),
            );
            const stylePaths: string[] =
                packageJson?.contributes?.["markdown.previewStyles"] ?? [];

            styles = stylePaths.map((relPath: string) => {
                const styleUri = vscode.Uri.file(path.join(extRoot, relPath));
                return webview.asWebviewUri(styleUri);
            });
        } catch (error) {
            codeforcesChannel.appendLine(
                `[Error] Fail to load built-in markdown style file: ${error}`,
            );
        }

        return styles
            .map(
                (style: vscode.Uri) =>
                    `<link rel="stylesheet" type="text/css" href="${style.toString()}">`,
            )
            .join(os.EOL);
    }

    private getSettingsStyles(): string {
        if (!this.config) {
            return "";
        }
        return [
            `<style>`,
            `body {`,
            `    ${this.config.fontFamily ? `font-family: ${this.config.fontFamily};` : ``}`,
            `    ${isNaN(this.config.fontSize) ? `` : `font-size: ${this.config.fontSize}px;`}`,
            `    ${isNaN(this.config.lineHeight) ? `` : `line-height: ${this.config.lineHeight};`}`,
            `}`,
            `</style>`,
        ].join(os.EOL);
    }

    private initEngine(): MarkdownIt {
        const md: MarkdownIt = new MarkdownIt({
            linkify: true,
            typographer: true,
            highlight: (code: string, lang?: string): string => {
                switch (lang && lang.toLowerCase()) {
                    case "mysql":
                        lang = "sql";
                        break;
                    case "json5":
                        lang = "json";
                        break;
                    case "python3":
                        lang = "python";
                        break;
                }
                if (lang && hljs.getLanguage(lang)) {
                    try {
                        return hljs.highlight(code, {
                            language: lang,
                            ignoreIllegals: true,
                        }).value;
                    } catch (error) {
                        /* do not highlight */
                    }
                }
                return ""; // use external default escaping
            },
        });

        this.addCodeBlockHighlight(md);
        this.addImageUrlCompletion(md);
        this.addLinkValidator(md);
        return md;
    }

    private addCodeBlockHighlight(md: MarkdownIt): void {
        const codeBlock: MarkdownIt.Renderer.RenderRule = md.renderer.rules[
            "code_block"
        ] as MarkdownIt.Renderer.RenderRule;
        // tslint:disable-next-line:typedef
        md.renderer.rules["code_block"] = (tokens, idx, options, env, self) => {
            if (!options.highlight) {
                return codeBlock(tokens, idx, options, env, self);
            }
            // if any token uses lang-specified code fence, then do not highlight code block
            if (tokens.some((token: any) => token.type === "fence")) {
                return codeBlock(tokens, idx, options, env, self);
            }
            // otherwise, highlight with default lang in env object.
            const highlighted: string = options.highlight(
                tokens[idx].content,
                env.lang,
                "",
            );
            return [
                `<pre><code ${self.renderAttrs(tokens[idx])} >`,
                highlighted || md.utils.escapeHtml(tokens[idx].content),
                "</code></pre>",
            ].join(os.EOL);
        };
    }

    private addImageUrlCompletion(md: MarkdownIt): void {
        const image: MarkdownIt.Renderer.RenderRule = md.renderer.rules[
            "image"
        ] as MarkdownIt.Renderer.RenderRule;
        // tslint:disable-next-line:typedef
        md.renderer.rules["image"] = (tokens, idx, options, env, self) => {
            const imageSrc: string[] | undefined = tokens[idx].attrs?.find(
                (value: string[]) => value[0] === "src",
            );
            if (env.host && imageSrc && imageSrc[1].startsWith("/")) {
                imageSrc[1] = `${env.host}${imageSrc[1]}`;
            }
            return image(tokens, idx, options, env, self);
        };
    }

    private addLinkValidator(md: MarkdownIt): void {
        const validateLink: (link: string) => boolean = md.validateLink;
        md.validateLink = (link: string): boolean => {
            // support file:// protocal link
            return validateLink(link) || link.startsWith("file:");
        };
    }
}

export const markdownEngine: MarkdownEngine = new MarkdownEngine();
