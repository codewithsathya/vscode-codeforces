import * as vscode from "vscode";

export function getProblemUrl(contestId?: string | number, index?: string | number) {
    return `https://codeforces.com/contest/${contestId}/problem/${index}`;
}

export function getContestUrl(contestId?: string | number) {
    return `https://codeforces.com/contest/${contestId}`;
}

export function openContestUrl(contestId?: string | number) {
    const url = getContestUrl(contestId);
    vscode.env.openExternal(vscode.Uri.parse(url));
}