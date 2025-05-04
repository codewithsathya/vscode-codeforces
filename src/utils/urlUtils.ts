import * as vscode from "vscode";
import { CodeforcesNode } from "../explorer/CodeforcesNode";

export function getProblemUrl(
    contestId?: string | number,
    index?: string | number,
) {
    return `https://codeforces.com/contest/${contestId}/problem/${index}`;
}

export function getCsesProblemUrl(id: string | number) {
    return `https://cses.fi/problemset/task/${id}`;
}

export function getContestUrl(contestId?: string | number) {
    return `https://codeforces.com/contest/${contestId}`;
}

export function openContestUrl(node: CodeforcesNode) {
    const url = getContestUrl(node.contest.id);
    vscode.env.openExternal(vscode.Uri.parse(url));
}

export function getNodeIdFromUrl(url: string): string {
    const regex = /contest\/(\d+)\/problem\/([A-Z]?\d*[A-Z]?\d*)/;
    const match = url.match(regex);
    if (match) {
        return `${match[1]}:${match[2]}`;
    } else {
        return "";
    }
}

export function getDetailsFromProblemUrl(url: string): {
    contestId: string;
    index: string;
} {
    const regex = /contest\/(\d+)\/problem\/([A-Z]?\d*[A-Z]?\d*)/;
    const match = url.match(regex);
    if (match) {
        return { contestId: match[1], index: match[2] };
    } else {
        return null;
    }
}

export function getMyContestSubmissionsUrl(contestId: string) {
    return `https://codeforces.com/contest/${contestId}/my`;
}
