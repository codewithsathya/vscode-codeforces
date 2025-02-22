import * as vscode from "vscode";
import { browserClient } from "./browserClient";
import { codeforcesChannel } from "./codeforcesChannel";

export function activate(context: vscode.ExtensionContext) {
    try {
        browserClient.initialize();
        console.log(
            'Congratulations, your extension "vscode-codeforces" is now active!',
        );
        context.subscriptions.push(
            codeforcesChannel,
            vscode.commands.registerCommand("vscode-codeforces.helloWorld", async () => {
                const content = await browserClient.getData("https://codeforces.com/contest/1426/problem/D");
                codeforcesChannel.appendLine(content);
            }),
        );
    } catch (error) {}
}

export function deactivate() {
    browserClient.close();
}
