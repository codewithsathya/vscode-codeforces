import * as vscode from "vscode";
import { browserClient } from "./browserClient";
import { codeforcesChannel } from "./codeforcesChannel";
import { codeforcesTreeDataProvider } from "./explorer/codeforcesTreeDataProvider";
import { explorerNodeManager } from "./explorer/explorerNodeManager";
import { codeforcesTreeItemDecorationProvider } from "./explorer/codeforcesTreeItemDecorationProvider";
import { CodeforcesNode } from "./explorer/CodeforcesNode";
import { switchSortingStrategy } from "./commands/plugin";
import { addHandle, pickOne, searchProblem } from "./commands/show";

export function activate(context: vscode.ExtensionContext) {
    try {
        browserClient.initialize();
        codeforcesTreeDataProvider.initialize(context);

        codeforcesTreeDataProvider.refresh();
        
        console.log(
            'Congratulations, your extension "vscode-codeforces" is now active!',
        );
        context.subscriptions.push(
            codeforcesChannel,
            explorerNodeManager,
            vscode.window.registerFileDecorationProvider(codeforcesTreeItemDecorationProvider),
            vscode.window.createTreeView("codeforcesExplorer", {
                treeDataProvider: codeforcesTreeDataProvider,
                showCollapseAll: true,
            }),
            vscode.commands.registerCommand(
                "vscode-codeforces.helloWorld",
                async () => {
                    const content = await browserClient.getData(
                        "https://codeforces.com/contest/1426/problem/D",
                    );
                    codeforcesChannel.appendLine(content);
                },
            ),
            vscode.commands.registerCommand("codeforces.addhandle", () => addHandle()),
            vscode.commands.registerCommand("codeforces.signin", () => {}),
            vscode.commands.registerCommand("codeforces.signout", () => {}),
            vscode.commands.registerCommand("codeforces.previewProblem", (node: CodeforcesNode) => {}),
            vscode.commands.registerCommand("codeforces.showProblem", (node: CodeforcesNode) => {}),
            vscode.commands.registerCommand("codeforces.pickOne", () => pickOne()),
            vscode.commands.registerCommand("codeforces.searchProblem", () => searchProblem()),
            vscode.commands.registerCommand("codeforces.showSolution", (input: CodeforcesNode | vscode.Uri) => {}),
            vscode.commands.registerCommand("codeforces.refreshExplorer", () => codeforcesTreeDataProvider.refresh()),
            vscode.commands.registerCommand("codeforces.testSolution", (uri?: vscode.Uri) => {}),
            vscode.commands.registerCommand("codeforces.submitSolution", (uri?: vscode.Uri) => {}),
            vscode.commands.registerCommand("codeforces.switchDefaultLanguage", () => {}),
            vscode.commands.registerCommand("codeforces.addFavorite", (node: CodeforcesNode) => {}),
            vscode.commands.registerCommand("codeforces.removeFavorite", (node: CodeforcesNode) => {}),
            vscode.commands.registerCommand("codeforces.openContest", (node: CodeforcesNode) => {
                vscode.env.openExternal(vscode.Uri.parse("https://codeforces.com/contest/" + node.contest?.id));
            }),
            vscode.commands.registerCommand("codeforces.problems.sort", () => switchSortingStrategy()),
        );
    } catch (error) {}
}

export function deactivate() {
    browserClient.close();
}
