import * as vscode from "vscode";
import { CodeforcesNode } from "./CodeforcesNode";
import { explorerNodeManager } from "./explorerNodeManager";
import { Category } from "../shared";
export class CodeforcesTreeDataProvider
    implements vscode.TreeDataProvider<CodeforcesNode>
{
    private onDidChangeTreeDataEvent: vscode.EventEmitter<CodeforcesNode | undefined | null> = new vscode.EventEmitter<
        CodeforcesNode| undefined | null
    >();    
    
    public readonly onDidChangeTreeData: vscode.Event<any> = this.onDidChangeTreeDataEvent.event;

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
            label: element.isProblem ? `${element.contestId}${element.index} ${element.name}` : element.name,
            tooltip: "codeforces",
            collapsibleState: element.isProblem ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed,
            command: element.isProblem ? {
                title: "Preview Problem",
                command: "codeforces.previewProblem",
                arguments: [element],
            } : undefined,
            resourceUri: element.isProblem ? vscode.Uri.parse(`https://codeforces.com/problemset/problem/${element.contestId}/${element.index}`) : undefined,
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
            return explorerNodeManager.getAllDifficultyNodes();
        } else if (id === Category.Tag) {
            return explorerNodeManager.getAllTagNodes();
        } else {
            return explorerNodeManager.getChildrenNodesById(id);
        }
    }

}

export const codeforcesTreeDataProvider: CodeforcesTreeDataProvider = new CodeforcesTreeDataProvider();