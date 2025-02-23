import * as vscode from "vscode";
import { CodeforcesNode } from "./CodeforcesNode";
import { explorerNodeManager } from "./explorerNodeManager";
import { Category, ProblemState } from "../shared";
import path from "path";
export class CodeforcesTreeDataProvider implements vscode.TreeDataProvider<CodeforcesNode> {
    private context: vscode.ExtensionContext | null = null;

    private onDidChangeTreeDataEvent: vscode.EventEmitter<CodeforcesNode | undefined | null> = new vscode.EventEmitter<
        CodeforcesNode| undefined | null
    >();    
    
    public readonly onDidChangeTreeData: vscode.Event<any> = this.onDidChangeTreeDataEvent.event;

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
        } else {
            contextValue = element.id.toLowerCase();
        }
        return {
            label: element.isProblem ? `[${element.contestId}${element.index}] ${element.name}` : element.name,
            tooltip: element.isProblem ? `Rating: ${element.rating ? element.rating : "UNKNOWN"}\nSolved Count: ${element.solvedCount}\nTags: ${element.tags}`: `${element.name}`,
            collapsibleState: element.isProblem ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed,
            command: element.isProblem ? {
                title: "Preview Problem",
                command: "codeforces.previewProblem",
                arguments: [element],
            } : undefined,
            iconPath: this.parseIconPathFromProblemState(element),
            resourceUri: element.uri,
            contextValue
        };
    }

    getChildren(
        element?: CodeforcesNode | undefined,
    ): vscode.ProviderResult<CodeforcesNode[]> {
        if(!element) {
            return explorerNodeManager.getRootNodes();
        } else {
            return this.getChildrenByElementId(element.id);
        }
    }

    private getChildrenByElementId(id: string): CodeforcesNode[] {
        if (id === Category.All) {
            return explorerNodeManager.getAllNodes();
        } else if (id === Category.Difficulty) {
            return explorerNodeManager.getAllRatingNodes();
        } else if (id === Category.Tag) {
            return explorerNodeManager.getAllTagNodes();
        } else {
            return explorerNodeManager.getChildrenNodesById(id);
        }
    }

    private parseIconPathFromProblemState(element: CodeforcesNode): string {
        if(!this.context) {
            return "";
        }
        if (!element.isProblem) {
            return "";
        }
        switch (element.state) {
            case ProblemState.ACCEPTED:
                return this.context.asAbsolutePath(path.join("resources", "check.png"));
            case ProblemState.PARTIAL:
            case ProblemState.WRONG_ANSWER:
                return this.context.asAbsolutePath(path.join("resources", "x.png"));
            case ProblemState.UNKNOWN:
                return this.context.asAbsolutePath(path.join("resources", "blank.png"));
            default:
                return "";
        }
    }
}

export const codeforcesTreeDataProvider: CodeforcesTreeDataProvider = new CodeforcesTreeDataProvider();