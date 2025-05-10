// eslint-disable-next-line @typescript-eslint/naming-convention
import _ from "lodash";
import { Disposable } from "vscode";
import { CodeforcesNode } from "./CodeforcesNode";
import {
    Category,
    CodeforcesTree,
    defaultProblem,
    IContest,
    SortingStrategy,
} from "../shared";
import { getSortingStrategy } from "../commands/plugin";
import { listCodeforcesContests, listCodeforcesProblems, listCsesProblems } from "../commands/list";
import { getA2oJProblems, getCP31Problems, getPastContestsMap, getRatings, getRunningContestsMap, getTags, getUpcomingContestsMap } from "../utils/dataUtils";
import { codeforcesTreeView } from "../extension";
import { globalState } from "../globalState";

class ExplorerNodeManager implements Disposable {
    private explorerNodeMap: Map<string, CodeforcesNode> = new Map<
        string,
        CodeforcesNode
    >();
    private dataTree: CodeforcesTree = {};

    public async refreshCache(): Promise<void> {
        this.dispose();

        const codeforcesProblems = await listCodeforcesProblems();
        const contests = await listCodeforcesContests();

        const favorites = globalState.getFavorite();

        const contestNameMap: Record<string, string> = {};
        for(const contest of contests) {
            contestNameMap[contest.id] = contest.name;
        }
        for (const problem of codeforcesProblems) {
            if (favorites[problem.id]) {
                problem.isFavorite = true;
            }
            problem.contestName = contestNameMap[problem.contestId];
            this.explorerNodeMap.set(problem.id, new CodeforcesNode(problem));
        }

        this.setContestNodes(contests);

        const csesProblemsData = await listCsesProblems();
        const problemMap: Record<string, string[]> = {};
        for (const topic of Object.keys(csesProblemsData)) {
            problemMap[topic] = [];
            for (const problem of csesProblemsData[topic]) {
                if (favorites[problem.id]) {
                    problem.isFavorite = true;
                }
                this.explorerNodeMap.set(problem.id, new CodeforcesNode(problem));
                problemMap[topic].push(problem.id);
            }
        }
        const allCsesProblems = Object.keys(csesProblemsData).reduce((acc, topic) => {
            return acc.concat(csesProblemsData[topic]);
        }, []);

        this.dataTree = {
            [Category.All]: codeforcesProblems.map(({ id }) => id),
            [Category.Rating]: getRatings(codeforcesProblems),
            [Category.Tag]: getTags(codeforcesProblems),
            [Category.Favorite]: [...codeforcesProblems.filter((problem) => problem.isFavorite).map(({ id }) => id)
                , ...allCsesProblems.filter((problem) => problem.isFavorite).map(({ id }) => id)],
            [Category.PastContests]: getPastContestsMap(contests, codeforcesProblems),
            [Category.RunningContests]: getRunningContestsMap(contests, codeforcesProblems),
            [Category.UpcomingContests]: getUpcomingContestsMap(contests),
            [Category.CSES]: problemMap,
            [Category.CP31]: getCP31Problems(),
            [Category.A2OJ]: getA2oJProblems(),
        };

        this.storeCodeforcesNodes();
    }

    public async setContestNodes(contests: IContest[]): Promise<void> {
        const validPhases = new Set(["FINISHED", "PENDING_SYSTEM_TEST", "SYSTEM_TEST"]);
        for (const contest of contests.filter((contest) => validPhases.has(contest.phase))) {
            this.explorerNodeMap.set(`${Category.PastContests}#${contest.name}`, new CodeforcesNode(Object.assign({}, defaultProblem, {
                id: `${Category.PastContests}#${contest.name}`,
                name: contest.name,
            }), false, contest));
        }
        for (const contest of contests.filter((contest) => contest.phase === "CODING")) {
            this.explorerNodeMap.set(`${Category.RunningContests}#${contest.name}`, new CodeforcesNode(Object.assign({}, defaultProblem, {
                id: `${Category.RunningContests}#${contest.name}`,
                name: contest.name,
            }), false, contest));
        }
        for (const contest of contests.filter((contest) => contest.phase === "BEFORE")) {
            this.explorerNodeMap.set(`${Category.UpcomingContests}#${contest.name}`, new CodeforcesNode(Object.assign({}, defaultProblem, {
                id: `${Category.UpcomingContests}#${contest.name}`,
                name: contest.name,
            }), false, contest));
        }
    }

    public getRootNodes(): CodeforcesNode[] {
        const nodes: CodeforcesNode[] = [];
        for (const category of Object.keys(this.dataTree)) {
            if (this.explorerNodeMap.has(category)) {
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
                if (this.explorerNodeMap.has(`${id}#${key}`)) {
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
        if (!childId || childId === "") {
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
            if (!data || Array.isArray(data)) {
                return;
            }
            if (typeof data === "object") {
                for (const key of Object.keys(data)) {
                    let id = "";
                    if (curr === "") {
                        id = key;
                    } else {
                        id = curr + "#" + key;
                    }
                    !map.has(id) && map.set(id, new CodeforcesNode(Object.assign({}, defaultProblem, {
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
