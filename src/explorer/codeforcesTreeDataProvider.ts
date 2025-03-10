import * as vscode from "vscode";
import { CodeforcesNode } from "./CodeforcesNode";
import { explorerNodeManager } from "./explorerNodeManager";
import { Category, ProblemState } from "../shared";
import path from "path";
import { formatDuration, getFormattedDate } from "../utils/dateUtils";
export class CodeforcesTreeDataProvider
    implements vscode.TreeDataProvider<CodeforcesNode>
{
    private context: vscode.ExtensionContext | null = null;

    private onDidChangeTreeDataEvent: vscode.EventEmitter<
        CodeforcesNode | undefined | null
    > = new vscode.EventEmitter<CodeforcesNode | undefined | null>();

    public readonly onDidChangeTreeData: vscode.Event<any> =
        this.onDidChangeTreeDataEvent.event;

    public initialize(context: vscode.ExtensionContext): void {
        this.context = context;
    }

    public async refresh(): Promise<void> {
        await explorerNodeManager.refreshCache();
        this.onDidChangeTreeDataEvent.fire(null);
    }

    getTreeItem(
        element: CodeforcesNode,
    ): vscode.TreeItem | Thenable<vscode.TreeItem> {
        let contextValue: string;
        if (element.isProblem) {
            contextValue = "problem";
        } else if (element.contest !== null) {
            contextValue = "contest";
        } else {
            contextValue = element.id.toLowerCase();
        }
        return {
            label: element.isProblem
                ? `[${element.contestId}${element.index}] ${element.name}`
                : element.name,
            tooltip: this.parseTooltipFromProblemState(element),
            collapsibleState: element.isProblem
                ? vscode.TreeItemCollapsibleState.None
                : vscode.TreeItemCollapsibleState.Collapsed,
            command: element.isProblem ? element.previewCommand : undefined,
            iconPath: this.parseIconPathFromProblemState(element),
            resourceUri: element.uri,
            contextValue,
        };
    }

    getChildren(
        element?: CodeforcesNode | undefined,
    ): vscode.ProviderResult<CodeforcesNode[]> {
        if (!element) {
            return explorerNodeManager.getRootNodes();
        } else {
            return this.getChildrenByElementId(element.id);
        }
    }

    private getChildrenByElementId(id: string): CodeforcesNode[] {
        if (id === Category.All) {
            return explorerNodeManager.getAllNodes();
        } else if (id === Category.Rating) {
            return explorerNodeManager.getAllRatingNodes();
        } else if (id === Category.Tag) {
            return explorerNodeManager.getAllTagNodes();
        } else if (id === Category.PastContests) {
            return explorerNodeManager.getAllPastContestNodes();
        } else if (id === Category.UpcomingContests) {
            return explorerNodeManager.getAllUpcomingContestNodes();
        } else if (id === Category.RunningContests) {
            return explorerNodeManager.getAllRunningContestNodes();
        } else {
            return explorerNodeManager.getChildrenNodesById(id);
        }
    }

    private parseTooltipFromProblemState(element: CodeforcesNode): string {
        if (!element.isProblem) {
            if (element.contest !== null) {
                return `Contest: ${element.contest.name}\nType: ${element.contest.type}\nStart: ${getFormattedDate(element.contest.startTimeSeconds)}\nDuration: ${formatDuration(element.contest.durationSeconds)}`;
            }
            return "";
        }
        return `Rating: ${element.rating ? element.rating : "UNKNOWN"}\nSolved Count: ${element.solvedCount}\nTags: ${element.tags}`;
    }

    private parseIconPathFromProblemState(element: CodeforcesNode): string {
        if (!this.context) {
            return "";
        }
        if (!element.isProblem) {
            return "";
        }
        switch (element.state) {
            case ProblemState.ACCEPTED:
                return this.context.asAbsolutePath(
                    path.join("resources", "check.png"),
                );
            case ProblemState.PARTIAL:
            case ProblemState.WRONG_ANSWER:
                return this.context.asAbsolutePath(
                    path.join("resources", "x.png"),
                );
            case ProblemState.UNKNOWN:
                return this.context.asAbsolutePath(
                    path.join("resources", "blank.png"),
                );
            default:
                return "";
        }
    }
}

export const codeforcesTreeDataProvider: CodeforcesTreeDataProvider =
    new CodeforcesTreeDataProvider();
