import * as vscode from "vscode";
import { IQuickItemEx, SortingStrategy } from "../shared";
import { codeforcesTreeDataProvider } from "../explorer/codeforcesTreeDataProvider";

const SORT_ORDER: SortingStrategy[] = [
    SortingStrategy.None,
    SortingStrategy.ContestAsc,
    SortingStrategy.ContestDesc,
    SortingStrategy.RatingAsc,
    SortingStrategy.RatingDesc,
    SortingStrategy.SolvedCountAsc,
    SortingStrategy.SolvedCountDesc,
];

export async function switchSortingStrategy(): Promise<void> {
    const currentStrategy: SortingStrategy = getSortingStrategy();
    const picks: Array<IQuickItemEx<string>> = [];
    picks.push(
        ...SORT_ORDER.map((s: SortingStrategy) => {
            return {
                label: `${currentStrategy === s ? "$(check)" : "    "} ${s}`,
                value: s,
            };
        }),
    );

    const choice: IQuickItemEx<string> | undefined =
        await vscode.window.showQuickPick(picks);
    if (!choice || choice.value === currentStrategy) {
        return;
    }

    const codeforcesConfig: vscode.WorkspaceConfiguration =
        vscode.workspace.getConfiguration("codeforces");
    await codeforcesConfig.update("problems.sortStrategy", choice.value, true);
    await codeforcesTreeDataProvider.refresh();
}

export function getSortingStrategy(): SortingStrategy {
    const codeforcesConfig: vscode.WorkspaceConfiguration =
        vscode.workspace.getConfiguration("codeforces");
    return codeforcesConfig.get<SortingStrategy>(
        "problems.sortStrategy",
        SortingStrategy.None,
    );
}

export async function setCodeforcesHandle(handle: string): Promise<void> {
    const codeforcesConfig: vscode.WorkspaceConfiguration =
        vscode.workspace.getConfiguration("codeforces");
    codeforcesConfig.update("handle", handle, true);
    await codeforcesTreeDataProvider.refresh();
}

export function getCodeforcesHandle(): string {
    const codeforcesConfig: vscode.WorkspaceConfiguration =
        vscode.workspace.getConfiguration("codeforces");
    return codeforcesConfig.get<string>("handle", "");
}
