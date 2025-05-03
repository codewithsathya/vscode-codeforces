// eslint-disable-next-line @typescript-eslint/naming-convention
import _ from "lodash";
import { Disposable } from "vscode";
import { CodeforcesNode } from "./CodeforcesNode";
import {
    Category,
    CodeforcesTree,
    defaultProblem,
    SortingStrategy,
} from "../shared";
import { getSortingStrategy } from "../commands/plugin";
import { listCodeforcesContests, listCodeforcesProblems } from "../commands/list";
import { getPastContestsMap, getRatings, getRunningContestsMap, getTags, getUpcomingContestsMap } from "../utils/dataUtils";
import { codeforcesTreeView } from "../extension";

class ExplorerNodeManager implements Disposable {
    private explorerNodeMap: Map<string, CodeforcesNode> = new Map<
        string,
        CodeforcesNode
    >();
    private dataTree: CodeforcesTree = {};

    public async refreshCache(): Promise<void> {
        this.dispose();
        
        const codeforcesProblems = await listCodeforcesProblems();
        for (const problem of codeforcesProblems) {
            this.explorerNodeMap.set(problem.id, new CodeforcesNode(problem));
        }

        const contests = await listCodeforcesContests();

        this.dataTree = {
            [Category.All]: codeforcesProblems.map(({ id })=> id),
            [Category.Rating]: getRatings(codeforcesProblems),
            [Category.Tag]: getTags(codeforcesProblems),
            [Category.PastContests]: getPastContestsMap(contests, codeforcesProblems),
            [Category.RunningContests]: getRunningContestsMap(contests, codeforcesProblems),
            [Category.UpcomingContests]: getUpcomingContestsMap(contests),
            [Category.CSES]: {},
            [Category.CP31]: {},
            [Category.A2OJ]: {},
        };

        this.storeCodeforcesNodes();

        // const runningContests = [];
        // for (const contest of contests) {
        //     this.contests.set(contest.id, contest);
        //     if (contest.phase === "CODING") {
        //         runningContests.push(contest);
        //     }
        // }
        // for (const contest of runningContests) {
        //     codeforcesChannel.appendLine(
        //         `Collecting running contest problems: ${contest.id}`,
        //     );
        //     const problems = await browserClient.getContestProblems(contest.id);
        //     if (!problems) {
        //         break;
        //     }
        //     for (const problem of problems) {
        //         const node = new CodeforcesNode(problem, true);
        //         this.explorerNodeMap.set(problem.id, node);
        //     }
        // }
    }

    public getRootNodes(): CodeforcesNode[] {
        const nodes: CodeforcesNode[] = [];
        for(const category of Object.keys(this.dataTree)) {
            if(this.explorerNodeMap.has(category)) {
                const node = this.explorerNodeMap.get(category);
                nodes.push(node);
            }
        }
        return nodes;
    }

    public getNodeById(id: string): CodeforcesNode | undefined {
        return this.explorerNodeMap.get(id);
    }

    public getChildrenNodesById(id: string): CodeforcesNode[] {
        const data = this.getExplorerDataById(id);
        if (!data) {
            return [];
        }
        if (Array.isArray(data)) {
            return this.applySortingStrategy(this.getProblemNodesByIds(data));
        } else {
            let res: CodeforcesNode[] = [];
            for (const key of Object.keys(data)) {
                if(this.explorerNodeMap.has(`${id}#${key}`)) {
                    const node = this.explorerNodeMap.get(`${id}#${key}`);
                    res.push(node);
                } else {
                    res.push(new CodeforcesNode(Object.assign({}, defaultProblem, {
                        id: `${id}#${key}`,
                        name: key,
                    }), false));
                }
            }
            return res;
        }
    }

    public getParentNode(childId: string): CodeforcesNode | undefined {
        if(!childId || childId === "") {
            return undefined;
        }
        const meta = childId.split("#");
        return this.explorerNodeMap.get(meta.slice(0, meta.length - 1).join("#"));
    }

    public getExplorerDataById(id: string) {
        let data: any = this.dataTree;
        if (!id || id === "") {
            return data;
        }
        const metaInfo: string[] = id.split("#");
        for (const key of metaInfo) {
            if (data[key] === undefined) {
                return null;
            }
            data = data[key];
        }
        return data;
    }

    public getProblemNodesByIds(ids: string[]): CodeforcesNode[] {
        const res: CodeforcesNode[] = [];
        for (const id of ids) {
            const node = this.explorerNodeMap.get(id);
            if (node) {
                res.push(node);
            }
        }
        return this.applySortingStrategy(res);
    }

    public dispose(): void {
        this.explorerNodeMap.clear();
        this.dataTree = {};
    }

    public revealNode(id: string) {
        const node = this.explorerNodeMap.get(id);
        if (node && codeforcesTreeView) {
            codeforcesTreeView.reveal(node, { select: true, focus: true, expand: true });
        }
    }

    private applySortingStrategy(nodes: CodeforcesNode[]): CodeforcesNode[] {
        const strategy: SortingStrategy = getSortingStrategy();
        switch (strategy) {
            case SortingStrategy.ContestAsc:
                return nodes.sort((a, b) => {
                    if (a.contestId === b.contestId) {
                        return a.index.localeCompare(b.index);
                    }
                    return a.contestId - b.contestId;
                });
            case SortingStrategy.ContestDesc:
                return nodes.sort((a, b) => {
                    if (a.contestId === b.contestId) {
                        return a.index.localeCompare(b.index);
                    }
                    return b.contestId - a.contestId;
                });
            case SortingStrategy.SolvedCountAsc:
                return nodes.sort((a, b) => {
                    if (a.solvedCount === b.solvedCount) {
                        return a.index.localeCompare(b.index);
                    }
                    return a.solvedCount - b.solvedCount;
                });
            case SortingStrategy.SolvedCountDesc:
                return nodes.sort((a, b) => {
                    if (a.solvedCount === b.solvedCount) {
                        return a.index.localeCompare(b.index);
                    }
                    return b.solvedCount - a.solvedCount;
                });
        }
        return nodes;
    }

    private storeCodeforcesNodes() {
        function dfs(data: any, curr: string, map: Map<string, CodeforcesNode>) {
            if(!data || Array.isArray(data)) {
                return;
            }
            if (typeof data === "object") {
                for (const key of Object.keys(data)) {
                    let id = "";
                    if(curr === "") {
                        id = key;
                    } else {
                        id = curr + "#" + key;
                    }
                    map.set(id, new CodeforcesNode(Object.assign({}, defaultProblem, {
                        id,
                        name: key,
                    }), false));
                    dfs(data[key], id, map);
                }
            }
        }
        dfs(this.dataTree, "", this.explorerNodeMap);
    }
}

export const explorerNodeManager: ExplorerNodeManager = new ExplorerNodeManager();
