import * as _ from "lodash";
import { Disposable } from "vscode";
import { CodeforcesNode } from "./CodeforcesNode";
import { Category, defaultProblem, IProblem } from "../shared";
import { codeforcesChannel } from "../codeforcesChannel";
import axiosClient from 'axios';

class ExplorerNodeManager implements Disposable {
    private explorerNodeMap: Map<string, CodeforcesNode> = new Map<string, CodeforcesNode>();
    private difficultySet: Set<string> = new Set<string>();
    private tagSet: Set<string> = new Set<string>();

    public async refreshCache(): Promise<void> {
        this.dispose();
        codeforcesChannel.appendLine("Fetching problems from codeforces");
        const { data } = await axiosClient.get("https://codeforces.com/api/problemset.problems") as { data: { result: { problems: IProblem[] } } };
        codeforcesChannel.appendLine("Fetched problems from codeforces");
        const problems = data.result.problems;
        codeforcesChannel.appendLine(`Fetched ${problems.length} problems from codeforces`);
        for (const problem of problems) {
            const node = new CodeforcesNode(problem, true);
            node.id = `${problem.contestId}:${problem.index}`;
            codeforcesChannel.appendLine(`Adding problem ${node.id}`);
            codeforcesChannel.appendLine(`Adding problem ${node.name}`);
            this.explorerNodeMap.set(node.id, node);
            this.difficultySet.add(problem.points ? problem.points.toString() : "UNKNOWN");
            for (const tag of problem.tags) {
                this.tagSet.add(tag);
            }
        }
    }

    public getRootNodes(): CodeforcesNode[] {
        return [
            new CodeforcesNode(Object.assign({}, defaultProblem, {
                id: Category.All,
                name: Category.All,
            }), false),
            new CodeforcesNode(Object.assign({}, defaultProblem, {
                id: Category.Difficulty,
                name: Category.Difficulty,
            }), false),
            new CodeforcesNode(Object.assign({}, defaultProblem, {
                id: Category.Tag,
                name: Category.Tag,
            }), false),
        ];
    }

    public getAllNodes(): CodeforcesNode[] {
        return Array.from(this.explorerNodeMap.values());
    }

    public getAllDifficultyNodes(): CodeforcesNode[] {
        const res: CodeforcesNode[] = [];
        for(const difficulty of this.difficultySet.values()) {
            res.push(new CodeforcesNode(Object.assign({}, defaultProblem, {
                id: `${Category.Difficulty}.${difficulty}`,
                name: difficulty,
            }), false));
        }
        return res;
    }

    public getAllTagNodes(): CodeforcesNode[] {
        const res: CodeforcesNode[] = [];
        for (const tag of this.tagSet.values()) {
            res.push(new CodeforcesNode(Object.assign({}, defaultProblem, {
                id: `${Category.Tag}.${tag}`,
                name: _.startCase(tag),
            }), false));
        }
        return res;
    }

    public getNodeById(id: string): CodeforcesNode | undefined {
        return this.explorerNodeMap.get(id);
    }

    public getChildrenNodesById(id: string): CodeforcesNode[] {
        const metaInfo: string[] = id.split(".");
        const res: CodeforcesNode[] = [];

        for (const node of this.explorerNodeMap.values()) {
            switch (metaInfo[0]) {
                case Category.Difficulty:
                    if(!node.points && metaInfo[1] === "UNKNOWN") {
                        res.push(node);
                        break;
                    }
                    if(node.points && node.points.toString() === metaInfo[1]) {
                        res.push(node);
                        break;
                    }
                case Category.Tag:
                    if (node.tags.indexOf(metaInfo[1]) >= 0) {
                        res.push(node);
                        break;
                    }
                default:
                    break;
            }
        }
        return res;
    }

    public dispose(): void {
        this.explorerNodeMap.clear();
        this.difficultySet.clear();
        this.tagSet.clear();
    }
}

export const explorerNodeManager: ExplorerNodeManager = new ExplorerNodeManager();
