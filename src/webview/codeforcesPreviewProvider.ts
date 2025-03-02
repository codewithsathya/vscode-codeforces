import { JSDOM } from "jsdom";
import { commands, ViewColumn } from "vscode";
import { IDescription, IProblem, IWebViewMessage } from "../shared";
import {
    ICodeforcesWebviewOption,
    CodeforcesWebview,
} from "./codeforcesWebview";
import { markdownEngine } from "./markdownEngine";
import { codeforcesChannel } from "../codeforcesChannel";
import * as vscode from "vscode";
import * as os from "os";
import { globalState } from "../globalState";

class CodeforcesPreviewProvider extends CodeforcesWebview {
    protected readonly viewType: string = "codeforces.preview";
    private node!: IProblem;
    private problemHtml!: string;
    private description!: IDescription;
    private sideMode: boolean = false;

    public isSideMode(): boolean {
        return this.sideMode;
    }

    public show(
        descString: string,
        node: IProblem,
        isSideMode: boolean = false,
    ): void {
        this.problemHtml = descString;
        this.description = this.parseDescription(descString, node);
        this.node = node;
        this.sideMode = isSideMode;
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
        const head: string = markdownEngine.render(`# [${title}](${url})`);
        const info: string = markdownEngine.render(`**Rating**: ${rating}`);
        const time: string = markdownEngine.render(
            `**Time limit per test**: ${timeLimit}`,
        );
        const memory: string = markdownEngine.render(
            `**Memory limit per test**: ${memoryLimit}`,
        );
        const tags: string = [
            `<details>`,
            `<summary><strong>Tags</strong></summary>`,
            markdownEngine.render(
                this.description.tags.map((t: string) => `${t}`).join(", "),
            ),
            `</details>`,
        ].join("\n");
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
                ${info}
                ${timeLimit === "" ? "" : time}
                ${memoryLimit === "" ? "" : memory}
                ${tags}
                ${body}
                ${!this.sideMode ? button.element : ""}
                <script>
                    const vscode = acquireVsCodeApi();
                    ${!this.sideMode ? button.script : ""}
                    document.addEventListener("DOMContentLoaded", function () {
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
        const dom = new JSDOM(html);
        const document = dom.window.document;

        let problemStatement = document.querySelector(".problem-statement");
        let body: string = "";
        if (problemStatement) {
            body = problemStatement.innerHTML.trim();
            body = body.replace(
                /<pre>[\r\n]*([^]+?)[\r\n]*<\/pre>/g,
                "<pre><code>$1</code></pre>",
            );
        } else {
            console.log("No problem-statement div found.");
        }
        document.querySelector(".time-limit ");
        let timeLimitDiv = document.querySelector(".time-limit");
        let memoryLimitDiv = document.querySelector(".memory-limit");
        let timeLimit: string = "";
        let memoryLimit: string = "";
        if (timeLimitDiv) {
            const lastChild = timeLimitDiv.lastChild;
            if (lastChild) {
                timeLimit = lastChild.textContent.trim();
            }
        }
        if (memoryLimitDiv) {
            const lastChild = memoryLimitDiv.lastChild;
            if (lastChild) {
                memoryLimit = lastChild.textContent.trim();
            }
        }

        return {
            title: `${problem.index}. ${problem.name}`,
            url: `https://codeforces.com/contest/${problem.contestId}/problem/${problem.index}`,
            rating: problem.rating ? `${problem.rating}` : "UNKNOWN",
            tags: problem.tags,
            timeLimit,
            memoryLimit,
            body,
        };
    }
}

export const codeforcesPreviewProvider: CodeforcesPreviewProvider =
    new CodeforcesPreviewProvider();
