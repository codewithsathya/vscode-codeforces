import * as vscode from "vscode";
import { browserClient } from "./browserClient";
import { codeforcesChannel } from "./codeforcesChannel";
import { codeforcesTreeDataProvider } from "./explorer/codeforcesTreeDataProvider";
import { explorerNodeManager } from "./explorer/explorerNodeManager";
import { codeforcesTreeItemDecorationProvider } from "./explorer/codeforcesTreeItemDecorationProvider";
import { CodeforcesNode } from "./explorer/CodeforcesNode";
import { switchSortingStrategy } from "./commands/plugin";
import {
    addHandle,
    pickOne,
    previewProblem,
    searchProblem,
    showJudge,
} from "./commands/show";
import { globalState } from "./globalState";
import JudgeViewProvider, {
    judgeViewProvider,
} from "./webview/judgeViewProvider";
import { getRetainWebviewContextPref } from "./cph/preferences";
import { openContestUrl } from "./utils/urlUtils";
import {
    checkLaunchWebview,
    editorChanged,
    editorClosed,
} from "./webview/editorChange";
import { setupCompanionServer } from "./cph/companion";
import runTestCases from "./cph/runTestCases";
import { submitToCodeForces } from "./cph/submit";
import { addFavorite, removeFavorite } from "./commands/star";

export let codeforcesTreeView: vscode.TreeView<CodeforcesNode> | undefined;

export function activate(context: vscode.ExtensionContext) {
    try {
        browserClient.initialize();
        codeforcesTreeDataProvider.initialize(context);
        globalState.initialize(context);

        codeforcesTreeDataProvider.refresh();

        codeforcesTreeView = vscode.window.createTreeView("codeforcesExplorer", { treeDataProvider: codeforcesTreeDataProvider, showCollapseAll: true });

        context.subscriptions.push(
            codeforcesChannel,
            explorerNodeManager,
            vscode.window.registerFileDecorationProvider(
                codeforcesTreeItemDecorationProvider,
            ),
            codeforcesTreeView,
            vscode.window.registerWebviewViewProvider(
                JudgeViewProvider.viewType,
                judgeViewProvider,
                {
                    webviewOptions: {
                        retainContextWhenHidden: getRetainWebviewContextPref(),
                    },
                },
            ),
            vscode.commands.registerCommand("codeforces.addhandle", () =>
                addHandle(),
            ),
            vscode.commands.registerCommand(
                "codeforces.previewProblem",
                (node: CodeforcesNode) => previewProblem(node),
            ),
            vscode.commands.registerCommand(
                "codeforces.showProblem",
                async (node: CodeforcesNode, html: string) => {
                    await showJudge(node, html);
                },
            ),
            vscode.commands.registerCommand("codeforces.testSolution", () =>
                runTestCases(),
            ),
            vscode.commands.registerCommand("codeforces.submitSolution", () =>
                submitToCodeForces(),
            ),
            vscode.commands.registerCommand("codeforces.pickOne", () =>
                pickOne(),
            ),
            vscode.commands.registerCommand("codeforces.searchProblem", () =>
                searchProblem(),
            ),
            vscode.commands.registerCommand("codeforces.clearCache", async () => {
                await globalState.clear();
                await codeforcesTreeDataProvider.refresh();
            }),
            vscode.commands.registerCommand("codeforces.refreshExplorer", () =>
                codeforcesTreeDataProvider.refresh(),
            ),
            vscode.commands.registerCommand("codeforces.addFavorite", (node: CodeforcesNode) => addFavorite(node)),
            vscode.commands.registerCommand("codeforces.removeFavorite", (node: CodeforcesNode) => removeFavorite(node)),
            vscode.commands.registerCommand(
                "codeforces.openContest",
                (node: CodeforcesNode) => openContestUrl(node),
            ),
            vscode.commands.registerCommand("codeforces.problems.sort", () =>
                switchSortingStrategy(),
            ),
        );

        checkLaunchWebview();

        vscode.workspace.onDidCloseTextDocument((e) => {
            editorClosed(e);
        });

        vscode.window.onDidChangeActiveTextEditor((e) => {
            editorChanged(e);
        });

        vscode.window.onDidChangeVisibleTextEditors((editors) => {
            if (editors.length === 0) {
                judgeViewProvider.extensionToJudgeViewMessage({
                    command: "new-problem",
                    problem: undefined,
                });
            }
        });
        setupCompanionServer();
    } catch (error) {
        codeforcesChannel.appendLine(`Error activating extension: ${error}`);
    }
}

export function deactivate() {
    browserClient.close();
}
