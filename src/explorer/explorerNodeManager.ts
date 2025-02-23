import * as _ from "lodash";
import { Disposable } from "vscode";
import { CodeforcesNode } from "./CodeforcesNode";
import { Category, defaultProblem, IProblem, ProblemsResponse, ProblemState, SortingStrategy } from "../shared";
import { codeforcesChannel } from "../codeforcesChannel";
import axiosClient from 'axios';
import { getSortingStrategy } from "../commands/plugin";

class ExplorerNodeManager implements Disposable {
    private explorerNodeMap: Map<string, CodeforcesNode> = new Map<string, CodeforcesNode>();
    private difficultySet: Set<string> = new Set<string>();
    private tagSet: Set<string> = new Set<string>();

    public async refreshCache(): Promise<void> {
        this.dispose();
        const { data } = await axiosClient.get("https://codeforces.com/api/problemset.problems") as { data: ProblemsResponse };
        const problems = data.result.problems;
        for (const problem of problems) {
            const node = new CodeforcesNode(problem, true);
            node.id = `${problem.contestId}:${problem.index}`;
            node.state = ProblemState.UNKNOWN;
            this.explorerNodeMap.set(node.id, node);
            this.difficultySet.add(problem.rating ? problem.rating.toString() : "UNKNOWN");
            for (const tag of problem.tags) {
                this.tagSet.add(tag);
            }
        }
        const problemStatistics = data.result.problemStatistics;
        for (const statistic of problemStatistics) {
            const node = this.explorerNodeMap.get(`${statistic.contestId}:${statistic.index}`);
            if (node) {
                node.solvedCount = statistic.solvedCount;
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
        return this.applySortingStrategy(Array.from(this.explorerNodeMap.values()));
    }

    public getAllDifficultyNodes(): CodeforcesNode[] {
        const res: CodeforcesNode[] = [];
        for(const difficulty of this.difficultySet.values()) {
            res.push(new CodeforcesNode(Object.assign({}, defaultProblem, {
                id: `${Category.Difficulty}.${difficulty}`,
                name: difficulty,
            }), false));
        }
        res.sort((a, b) => {
            let aRating = a.name === "UNKNOWN" ? 0 : parseInt(a.name);
            let bRating = b.name === "UNKNOWN" ? 0 : parseInt(b.name);
            return aRating - bRating;
        });
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
        res.sort((a, b) => {
            return a.name.localeCompare(b.name);
        });
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
                    if(!node.rating && metaInfo[1] === "UNKNOWN") {
                        res.push(node);
                        break;
                    }
                    if(node.rating && node.rating.toString() === metaInfo[1]) {
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
        return this.applySortingStrategy(res);
    }

    public dispose(): void {
        this.explorerNodeMap.clear();
        this.difficultySet.clear();
        this.tagSet.clear();
    }

    private applySortingStrategy(nodes: CodeforcesNode[]): CodeforcesNode[] {
        const strategy: SortingStrategy = getSortingStrategy();
        switch(strategy) {
            case SortingStrategy.ContestAsc:
                return nodes.sort((a, b) => {
                    if(a.contestId === b.contestId) {
                        return a.index.localeCompare(b.index);
                    }
                    return a.contestId - b.contestId;
                }
            );
            case SortingStrategy.ContestDesc:
                return nodes.sort((a, b) => {
                    if(a.contestId === b.contestId) {
                        return a.index.localeCompare(b.index);
                    }
                    return b.contestId - a.contestId;
                }
            );
            case SortingStrategy.SolvedCountAsc:
                return nodes.sort((a, b) => {
                    if(a.solvedCount === b.solvedCount) {
                        return a.index.localeCompare(b.index);
                    }
                    return a.solvedCount - b.solvedCount;
                }
            );
            case SortingStrategy.SolvedCountDesc:
                return nodes.sort((a, b) => {
                    if(a.solvedCount === b.solvedCount) {
                        return a.index.localeCompare(b.index);
                    }
                    return b.solvedCount - a.solvedCount;
                }
            );
        }
        return nodes;
    }
}

export const explorerNodeManager: ExplorerNodeManager = new ExplorerNodeManager();
