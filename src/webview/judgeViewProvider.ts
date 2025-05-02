import * as vscode from "vscode";
import { killRunning } from "../cph/executions";
import { saveProblem } from "../cph/parser";
import { VSToWebViewMessage, WebviewToVSEvent } from "../cph/types";
import { deleteProblemFile, getProblemForDocument } from "../cph/utils";
import { runSingleAndSave } from "./processRunSingle";
import runAllAndSave from "./processRunAll";
import runTestCases from "../cph/runTestCases";
import {
    getAutoShowJudgePref,
    getRetainWebviewContextPref,
} from "../cph/preferences";
import { setOnlineJudgeEnv } from "../cph/compiler";
import { globalState } from "../globalState";
import { codeforcesChannel } from "../codeforcesChannel";
import { showDescription } from "./showDescription";
import { submitProblem } from "../cph/companion";

class JudgeViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = "codeforces.judgeView";

    private _view?: vscode.WebviewView;

    private messageBuffer: VSToWebViewMessage[] = [];

    public isViewUninitialized() {
        return this._view === undefined;
    }

    constructor() {}

    public resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [globalState.getExtensionUri()],
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(
            async (message: WebviewToVSEvent) => {
                switch (message.command) {
                    case "show-description": {
                        const problem = message.problem;
                        showDescription(problem);
                        break;
                    }

                    case "run-single-and-save": {
                        const problem = message.problem;
                        const id = message.id;
                        runSingleAndSave(problem, id);
                        break;
                    }

                    case "run-all-and-save": {
                        const problem = message.problem;
                        runAllAndSave(problem);
                        break;
                    }

                    case "save": {
                        saveProblem(message.problem.srcPath, message.problem);
                        break;
                    }

                    case "kill-running": {
                        killRunning();
                        break;
                    }

                    case "delete-tcs": {
                        this.extensionToJudgeViewMessage({
                            command: "new-problem",
                            problem: undefined,
                        });
                        deleteProblemFile(message.problem.srcPath);
                        break;
                    }

                    case "submitCf": {
                        const problem = message.problem;
                        await submitProblem(problem);
                        break;
                    }

                    case "online-judge-env": {
                        setOnlineJudgeEnv(message.value);
                        break;
                    }

                    case "get-initial-problem": {
                        this.getInitialProblem();
                        break;
                    }

                    case "create-local-problem": {
                        runTestCases();
                        break;
                    }

                    case "url": {
                        vscode.env.openExternal(vscode.Uri.parse(message.url));
                        break;
                    }

                    default: {
                        codeforcesChannel.appendLine(
                            "Unknown event received from webview",
                        );
                    }
                }
            },
        );
    }

    private getInitialProblem() {
        const doc = vscode.window.activeTextEditor?.document;
        this.extensionToJudgeViewMessage({
            command: "new-problem",
            problem: getProblemForDocument(doc),
        });

        this.messageBuffer.forEach((message) => {
            this._view?.webview.postMessage(message);
        });

        this.messageBuffer = [];

        return;
    }

    public problemPath: string | undefined;

    public async focus() {
        if (!this._view) {
            await vscode.commands.executeCommand("codeforces.judgeView.focus");
        } else {
            this._view.show?.(true);
        }
    }

    private focusIfNeeded = (message: VSToWebViewMessage) => {
        switch (message.command) {
            case "waiting-for-submit":
            case "compiling-start":
            case "run-all": {
                this.focus();
            }
        }

        if (
            message.command === "new-problem" &&
            message.problem !== undefined &&
            getAutoShowJudgePref()
        ) {
            this.focus();
        }
    };

    /** Posts a message to the webview. */
    public extensionToJudgeViewMessage = async (
        message: VSToWebViewMessage,
    ) => {
        this.focusIfNeeded(message);
        if (
            (this._view && this._view.visible) ||
            (this._view && getRetainWebviewContextPref())
        ) {
            this._view.webview.postMessage(message);
            if (message.command !== "submit-finished") {
                codeforcesChannel.appendLine(`View got message: ${message}`);
            }
            if (message.command === "new-problem") {
                if (message.problem === undefined) {
                    this.problemPath = undefined;
                } else {
                    this.problemPath = message.problem.srcPath;
                }
            }
        } else {
            if (message.command !== "new-problem") {
                codeforcesChannel.appendLine(
                    `Pushing to buffer: ${message.command}`,
                );
                this.messageBuffer.push(message);
            } else {
                this.messageBuffer = [];
            }
        }
    };

    private _getHtmlForWebview(webview: vscode.Webview) {
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(
                globalState.getExtensionUri(),
                "public",
                "styles",
                "cph.css",
            ),
        );

        const codiconsUri = webview.asWebviewUri(
            vscode.Uri.joinPath(
                globalState.getExtensionUri(),
                "public",
                "styles",
                "codicon.css",
            ),
        );

        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(
                globalState.getExtensionUri(),
                "public",
                "scripts",
                "frontend.module.js",
            ),
        );

        const html = `
            <!DOCTYPE html lang="EN">
            <html>
                <head>
                    <link rel="stylesheet" href="${styleUri}" />
                    <link rel="stylesheet" href="${codiconsUri}" />
                    <meta charset="UTF-8" />
                </head>
                <body>
                    <div id="app">
                        An error occurred! Restarting VS Code may solve the issue.
                    </div>
                    <script>
                        window.vscodeApi = acquireVsCodeApi();
                        document.addEventListener(
                            'DOMContentLoaded',
                            (event) => {
                                vscodeApi.postMessage({
                                    command: 'get-initial-problem',
                                });
                                vscodeApi.postMessage({
                                    command: 'online-judge-env',
                                    value:false,
                                });
                            },
                        );
                    </script>
                    <script src="${scriptUri}"></script>
                </body>
            </html>
        `;

        return html;
    }
}

export default JudgeViewProvider;

export const judgeViewProvider = new JudgeViewProvider();
