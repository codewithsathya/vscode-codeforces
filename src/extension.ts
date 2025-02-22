import * as vscode from "vscode";
import { browserClient } from "./browserClient";
import { codeforcesChannel } from "./codeforcesChannel";
import { codeforcesTreeDataProvider } from "./explorer/codeforcesTreeDataProvider";
import { explorerNodeManager } from "./explorer/explorerNodeManager";

export function activate(context: vscode.ExtensionContext) {
    try {
        browserClient.initialize();

        codeforcesTreeDataProvider.refresh();
        
        console.log(
            'Congratulations, your extension "vscode-codeforces" is now active!',
        );
        context.subscriptions.push(
            codeforcesChannel,
            explorerNodeManager,
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
        );
    } catch (error) {}
}

export function deactivate() {
    browserClient.close();
}
