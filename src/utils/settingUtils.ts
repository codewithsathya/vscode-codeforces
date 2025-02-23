import * as vscode from "vscode";

export function getWorkspaceConfiguration(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration("codeforces");
}

export function shouldHideSolvedProblem(): boolean {
    return getWorkspaceConfiguration().get<boolean>("hideSolved", false);
}