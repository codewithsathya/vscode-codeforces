import * as os from "os";

import { commands, ViewColumn } from "vscode";
import * as vscode from "vscode";
import _ from "lodash";

import {
    Category,
    CodeforcesSolution,
    IDescription,
    IProblem,
    IWebViewMessage,
} from "../shared";
import { codeforcesChannel } from "../codeforcesChannel";
import { globalState } from "../globalState";
import { explorerNodeManager } from "../explorer/explorerNodeManager";
import {
    parseCodeforcesDescription,
    parseCsesDescription,
} from "../parsers/htmlParser";

import { markdownEngine } from "./markdownEngine";
import {
    ICodeforcesWebviewOption,
    CodeforcesWebview,
} from "./codeforcesWebview";

class CodeforcesPreviewProvider extends CodeforcesWebview {
    protected readonly viewType: string = "codeforces.preview";
    private node!: IProblem;
    private problemHtml!: string;
    private description!: IDescription;
    private sideMode: boolean = false;
    private solutions: CodeforcesSolution[] = [];

    public isSideMode(): boolean {
        return this.sideMode;
    }

    public show(
        descString: string,
        node: IProblem,
        isSideMode: boolean = false,
        solutions: CodeforcesSolution[] = [],
    ): void {
        this.problemHtml = descString;
        this.description = this.parseDescription(descString, node);
        this.node = node;
        this.sideMode = isSideMode;
        this.solutions = solutions;
        this.showWebviewInternal();
    }

    protected getWebviewOption(): ICodeforcesWebviewOption {
        if (!this.sideMode) {
            return {
                title: `${this.node.name}: Preview`,
                viewColumn: ViewColumn.One,
            };
        } else {
            return {
                title: "Description",
                viewColumn: ViewColumn.Two,
                preserveFocus: true,
            };
        }
    }

    protected getWebviewContent(): string {
        const webview = this.panel?.webview;
        if (!webview) {
            codeforcesChannel.appendLine("webview is undefined");
            return "";
        }
        const styles: string = [
            markdownEngine.getStyles(webview),
            this.getStyles(),
        ].join("\n");
        const scripts: string = this.getScripts();

        const button: { element: string; script: string; style: string } = {
            element: `<button id="solve">Code Now</button>`,
            script: `const button = document.getElementById('solve');
                    button.onclick = () => vscode.postMessage({
                        command: 'ShowProblem',
                    });`,
            style: `<style>
                #solve {
                    position: fixed;
                    bottom: 1rem;
                    right: 1rem;
                    border: 0;
                    margin: 1rem 0;
                    padding: 0.2rem 1rem;
                    color: white;
                    background-color: var(--vscode-button-background);
                }
                #solve:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                #solve:active {
                    border: 0;
                }
                </style>`,
        };
        const { title, url, rating, body, timeLimit, memoryLimit } =
            this.description;

        const head: string = `
            <h1 class="problem-title">
                <a href="${url}" target="_blank">${title}</a>
            </h1>
        `;

        const contest: string = `
            <p><strong>Contest:</strong> 
                <a href="https://codeforces.com/contest/${this.node.contestId}" target="_blank">
                    ${this.node.contestName}
                </a>
            </p>
        `;

        const info: string = `
            <p><strong>Rating:</strong> ${rating}</p>
        `;

        const time: string = `
            <p><strong>Time limit per test:</strong> ${timeLimit}</p>
        `;

        const memory: string = `
            <p><strong>Memory limit per test:</strong> ${memoryLimit}</p>
        `;

        const tags: string =
            this.description.tags.length > 0
                ? [
                      `<details>`,
                      `<summary><strong>Tags</strong></summary>`,
                      `<div style="display: flex; flex-wrap: wrap; gap: 0.5em; margin-top: 0.5em;">`,
                      this.description.tags
                          .map(
                              (t: string) =>
                                  `<span style="cursor: pointer"><a onclick="onTagClick('${_.startCase(t)}')"><code>${_.startCase(t)}</code></a></span>`,
                          )
                          .join("\n"),
                      `</div>`,
                      `</details>`,
                  ].join("\n")
                : "";

        const solutions: string =
            this.solutions.length > 0
                ? [
                      `<details>`,
                      `<summary><strong>Solutions</strong></summary>`,
                      `<div style="display: flex; flex-wrap: wrap; gap: 0.5em; margin-top: 0.5em;">`,
                      this.solutions
                          .map(
                              (t: CodeforcesSolution) =>
                                  `<span style="cursor: pointer"><a href="https://codeforces.com/contest/${t.contestId}/submission/${t.submissionId}"><code>${t.username}'s solution</code></a></span>`,
                          )
                          .join("\n"),
                      `</div>`,
                      `</details>`,
                  ].join("\n")
                : "";
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta http-equiv="Content-Security-Policy" content="
                    default-src 'none'; 
                    img-src ${webview.cspSource} https: data:; 
                    script-src ${webview.cspSource} 'unsafe-inline' 'unsafe-eval'; 
                    style-src ${webview.cspSource} 'unsafe-inline' https://*.vscode-cdn.net https://cdnjs.cloudflare.com https://katex.org; 
                    font-src ${webview.cspSource} https://*.vscode-cdn.net https://cdnjs.cloudflare.com https://katex.org data:;
                ">
                ${styles}
                ${!this.sideMode ? button.style : ""}
                ${button.style}
                ${scripts}
            </head>
            <body>
                ${head}
                ${this.node.contestName ? contest : ""}
                ${rating.length > 0 ? info : ""}
                ${timeLimit === "" ? "" : time}
                ${memoryLimit === "" ? "" : memory}
                ${tags}
                ${solutions}
                <div class="section-title">Description</div>
                ${body}
                ${!this.sideMode ? button.element : ""}
                <script>
                    const vscode = acquireVsCodeApi();
                    ${!this.sideMode ? button.script : ""}
                    document.addEventListener("DOMContentLoaded", function () {
                        const mathElements = document.getElementsByClassName("math");
                        const macros = {};
                        for (let element of mathElements) {
                            katex.render(element.textContent, element, {
                                displayMode: element.classList.contains("math-display"),
                                throwOnError: false,
                                globalGroup: true,
                                macros,
                            });
                        }
                        if (window.renderMathInElement) {
                            renderMathInElement(document.body, {
                                delimiters: [
                                    { left: "$$$$$$", right: "$$$$$$", display: true },
                                    { left: "$$$", right: "$$$", display: false }
                                ]
                            });
                        }
                        document.querySelectorAll(".input, .output").forEach((block, index) => {
                            const titleDiv = block.querySelector(".title");
                            const codeBlock = block.querySelector("pre code");

                            if (titleDiv && codeBlock) {
                                const copyButton = document.createElement("button");
                                copyButton.textContent = "Copy";
                                copyButton.classList.add("input-output-copier");
                                
                                const uniqueId = "copy-target-" + index;
                                codeBlock.setAttribute("id", uniqueId);
                                copyButton.setAttribute("data-clipboard-target", "#" + uniqueId);

                                titleDiv.appendChild(copyButton);
                            }
                        });
                        const clipboard = new ClipboardJS('.input-output-copier');
                        clipboard.on('success', function (e) {
                            e.clearSelection();
                        });
                        clipboard.on('error', function () {
                            console.error('Error copying text.');
                        });
                    });
                    function onTagClick(tag) {
                        vscode.postMessage({ command: 'TagClick', tag });
                    }
                </script>
            </body>
            </html>
        `;
    }

    protected onDidDisposeWebview(): void {
        super.onDidDisposeWebview();
        this.sideMode = false;
    }

    protected async onDidReceiveMessage(
        message: IWebViewMessage,
    ): Promise<void> {
        codeforcesChannel.appendLine("Message received");
        switch (message.command) {
            case "ShowProblem": {
                await commands.executeCommand(
                    "codeforces.showProblem",
                    this.node,
                    this.problemHtml,
                );
                break;
            }
            case "TagClick": {
                explorerNodeManager.revealNode(
                    `${Category.Tag}#${message.tag}`,
                );
                break;
            }
        }
    }

    public getStyles(): string {
        let styles: vscode.Uri[] = [];
        try {
            const stylePaths: string[] = ["katex.min.css", "style.css"];
            styles = stylePaths.map((p: string) => {
                const onDiskPath = vscode.Uri.joinPath(
                    globalState.getExtensionUri(),
                    "public",
                    "styles",
                    p,
                );
                return this.panel
                    ? this.panel.webview.asWebviewUri(onDiskPath)
                    : onDiskPath;
            });
        } catch (error) {
            codeforcesChannel.appendLine(
                "[Error] Fail to load codeforces preview styles.",
            );
        }
        return styles
            .map(
                (style: vscode.Uri) =>
                    `<link rel="stylesheet" type="text/css" href="${style}">`,
            )
            .join(os.EOL);
    }

    public getScripts() {
        let scripts: vscode.Uri[] = [];
        try {
            const scriptPaths = [
                "katex.min.js",
                "auto-render.min.js",
                "clipboard.min.js",
            ];
            scripts = scriptPaths.map((p: string) => {
                const onDiskPath = vscode.Uri.joinPath(
                    globalState.getExtensionUri(),
                    "public",
                    "scripts",
                    p,
                );
                return this.panel
                    ? this.panel.webview.asWebviewUri(onDiskPath)
                    : onDiskPath;
            });
        } catch (error) {
            codeforcesChannel.appendLine(
                "[Error] Fail to load codeforces preview scripts.",
            );
        }
        return scripts
            .map(
                (script: vscode.Uri) =>
                    `<script src="${script.toString()}"></script>`,
            )
            .join(os.EOL);
    }

    // private async hideSideBar(): Promise<void> {
    //     await commands.executeCommand("workbench.action.focusSideBar");
    //     await commands.executeCommand("workbench.action.toggleSidebarVisibility");
    // }

    private parseDescription(html: string, problem: IProblem): IDescription {
        if (problem.platform === "cses") {
            return parseCsesDescription(html, problem);
        }
        return parseCodeforcesDescription(html, problem);
    }
}

export const codeforcesPreviewProvider: CodeforcesPreviewProvider =
    new CodeforcesPreviewProvider();
