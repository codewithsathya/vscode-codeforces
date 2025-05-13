import * as vscode from "vscode";

import { DescriptionConfiguration, IDescriptionConfiguration } from "../shared";

export function getWorkspaceConfiguration(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration("codeforces");
}

export function isColorizingEnabled(): boolean {
    return getWorkspaceConfiguration().get<boolean>("colorizeProblems", true);
}

export function shouldHideSolvedProblem(): boolean {
    return getWorkspaceConfiguration().get<boolean>("hideSolved", false);
}

export function isTagGroupingEnabled(): boolean {
    return getWorkspaceConfiguration().get<boolean>("tagGroupingEnabled", true);
}

export function getDescriptionConfiguration(): IDescriptionConfiguration {
    const setting: string = getWorkspaceConfiguration().get<string>(
        "showDescription",
        DescriptionConfiguration.InWebView,
    );
    const config: IDescriptionConfiguration = {
        showInComment: false,
        showInWebview: true,
    };
    switch (setting) {
        case DescriptionConfiguration.Both:
            config.showInComment = true;
            config.showInWebview = true;
            break;
        case DescriptionConfiguration.None:
            config.showInComment = false;
            config.showInWebview = false;
            break;
        case DescriptionConfiguration.InFileComment:
            config.showInComment = true;
            config.showInWebview = false;
            break;
        case DescriptionConfiguration.InWebView:
            config.showInComment = false;
            config.showInWebview = true;
            break;
    }

    // To be compatible with the deprecated setting:
    if (getWorkspaceConfiguration().get<boolean>("showCommentDescription")) {
        config.showInComment = true;
    }

    return config;
}

export function getSolutionHandles(): string[] {
    return getWorkspaceConfiguration().get<Array<string>>(
        "solutionHandles",
        [],
    );
}

export function showSolutionLinks(): boolean {
    return getWorkspaceConfiguration().get<boolean>("showSolutionLinks", true);
}
