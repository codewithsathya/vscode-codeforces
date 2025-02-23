import { JSDOM } from 'jsdom';
import { commands, ViewColumn } from "vscode";
import { IDescription, IProblem, IWebViewMessage } from "../shared";
import { ILeetCodeWebviewOption, LeetCodeWebview } from "./codeforcesWebview";
import { markdownEngine } from "./markdownEngine";
import { codeforcesChannel } from '../codeforcesChannel';
import * as path from 'path';
import * as vscode from 'vscode';
import * as os from 'os';
import { globalState } from '../globalState';

class CodeforcesPreviewProvider extends LeetCodeWebview {
    protected readonly viewType: string = "leetnotion.preview";
    private node!: IProblem;
    private description!: IDescription;
    private sideMode: boolean = false;

    public isSideMode(): boolean {
        return this.sideMode;
    }

    public show(descString: string, node: IProblem, isSideMode: boolean = false): void {
        this.description = this.parseDescription(descString, node);
        this.node = node;
        this.sideMode = isSideMode;
        this.showWebviewInternal();
    }

    protected getWebviewOption(): ILeetCodeWebviewOption {
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
        if(!webview) {
            codeforcesChannel.appendLine("webview is undefined");
            return "";
        }
        const styles: string = [markdownEngine.getStyles(webview), this.getStyles()].join("\n");
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
        const { title, url, rating, body } = this.description;
        const head: string = markdownEngine.render(`# [${title}](${url})`);
        const info: string = markdownEngine.render(`**Rating**: ${rating}`);
        const tags: string = [
            `<details>`,
            `<summary><strong>Tags</strong></summary>`,
            markdownEngine.render(this.description.tags.map((t: string) => `${t}`).join(", ")),
            `</details>`,
        ].join("\n");
        codeforcesChannel.appendLine(body);
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
                ${scripts}
            </head>
            <body>
                ${head}
                ${info}
                ${tags}
                ${body}
                <hr />
                ${!this.sideMode ? button.element : ""}
                <script>
                    const vscode = acquireVsCodeApi();
                    ${!this.sideMode ? button.script : ""}
                    document.addEventListener("DOMContentLoaded", () => {
                        if (window.renderMathInElement) {
                            renderMathInElement(document.body, {
                                delimiters: [
                                    { left: "$$$", right: "$$$", display: false },
                                    { left: "$$$$$$", right: "$$$$$$", display: true },
                                ]
                            });
                        }
                        const clipboard = new ClipboardJS('.input-output-copier', {
                            target: function(trigger) {
                                return document.querySelector(trigger.getAttribute('data-clipboard-target'));
                            }
                        });

                        clipboard.on('success', function(e) {
                            console.log('Text copied successfully!');
                            e.clearSelection();
                        });

                        clipboard.on('error', function(e) {
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

    protected async onDidReceiveMessage(message: IWebViewMessage): Promise<void> {
        switch (message.command) {
            case "ShowProblem": {
                await commands.executeCommand("leetnotion.showProblem", this.node);
                break;
            }
        }
    }

    public getStyles(): string {
        let styles: vscode.Uri[] = [];
        try {
            const stylePaths: string[] = ['katex.min.css', 'style.css'];
            styles = stylePaths.map((p: string) => {
                const onDiskPath = vscode.Uri.joinPath(globalState.getExtensionUri(), "public", "styles", p);
                return this.panel ? this.panel.webview.asWebviewUri(onDiskPath) : onDiskPath;
            });
        } catch (error) {
            codeforcesChannel.appendLine("[Error] Fail to load built-in markdown style file.");
        }
        return styles.map((style: vscode.Uri) => `<link rel="stylesheet" type="text/css" href="${style}">`).join(os.EOL);
    }

    public getScripts() {
        let scripts: vscode.Uri[] = [];
        try {
            const scriptPaths = ["katex.min.js", "auto-render.min.js", "clipboard.min.js"];
            scripts = scriptPaths.map((p: string) => {
                const onDiskPath = vscode.Uri.joinPath(globalState.getExtensionUri(), "public", "scripts", p);
                return this.panel ? this.panel.webview.asWebviewUri(onDiskPath) : onDiskPath;
            });
        } catch (error) {
            codeforcesChannel.appendLine("[Error] Fail to load built-in markdown style file.");
        }
        return scripts.map((script: vscode.Uri) => `<script src="${script.toString()}"></script>`).join(os.EOL);
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
            body = body.replace(/<pre>[\r\n]*([^]+?)[\r\n]*<\/pre>/g, "<pre><code>$1</code></pre>");
        } else {
            console.log("No problem-statement div found.");
        }

        return {
            title: `${problem.index}. ${problem.name}`,
            url: `https://codeforces.com/contest/${problem.contestId}/problem/${problem.index}`,
            rating: problem.rating ? `${problem.rating}` : "UNKNOWN",
            tags: problem.tags,
            body
        };
    }
}


export const codeforcesPreviewProvider: CodeforcesPreviewProvider = new CodeforcesPreviewProvider();
