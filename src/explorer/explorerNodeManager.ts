import * as _ from "lodash";
import { Disposable } from "vscode";
import { CodeforcesNode } from "./CodeforcesNode";
import { Category, ContestsResponse, defaultProblem, IContest, ProblemsResponse, ProblemState, SortingStrategy } from "../shared";
import axiosClient from 'axios';
import { getCodeforcesHandle, getSortingStrategy } from "../commands/plugin";
import { shouldHideSolvedProblem } from "../utils/settingUtils";
import { browserClient } from "../browserClient";
import { codeforcesChannel } from "../codeforcesChannel";

class ExplorerNodeManager implements Disposable {
    private explorerNodeMap: Map<string, CodeforcesNode> = new Map<string, CodeforcesNode>();
    private difficultySet: Set<string> = new Set<string>();
    private tagSet: Set<string> = new Set<string>();
    private contests: Map<number, IContest> = new Map<number, IContest>();

    public async refreshCache(): Promise<void> {
        this.dispose();
        const { data } = await axiosClient.get("https://codeforces.com/api/problemset.problems") as { data: ProblemsResponse };
        let problems = data.result.problems;
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
        const handle = getCodeforcesHandle();
        if (handle && handle.length > 0) {
            const { data } = await axiosClient.get(`https://codeforces.com/api/user.status?handle=${handle}`) as { data: any };
            for (const submission of data.result) {
                const problemId = `${submission.problem.contestId}:${submission.problem.index}`;
                const node = this.explorerNodeMap.get(problemId);
                if (node) {
                    if (submission.verdict === "OK") {
                        node.state = ProblemState.ACCEPTED;
                    } else {
                        node.state = ProblemState.WRONG_ANSWER;
                    }
                }
            }
        }
        const { data: contestsData } = await axiosClient.get("https://codeforces.com/api/contest.list") as { data: ContestsResponse };
        const contests = contestsData.result;
        const runningContests = [];
        for (const contest of contests) {
            this.contests.set(contest.id, contest);
            if(contest.phase === "CODING") {
                runningContests.push(contest);
            }
        }
        for (const contest of runningContests) {
            codeforcesChannel.appendLine(`Collecting running contest problems: ${contest.id}`);
            const problems = await browserClient.getContestProblems(contest.id);
            if(!problems) {
                break;
            }
            for(const problem of problems) {
                const node = new CodeforcesNode(problem, true);
                this.explorerNodeMap.set(problem.id, node);
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
                id: Category.Rating,
                name: Category.Rating,
            }), false),
            new CodeforcesNode(Object.assign({}, defaultProblem, {
                id: Category.Tag,
                name: Category.Tag,
            }), false),
            new CodeforcesNode(Object.assign({}, defaultProblem, {
                id: Category.PastContests,
                name: Category.PastContests,
            }), false),
            new CodeforcesNode(Object.assign({}, defaultProblem, {
                id: Category.RunningContests,
                name: Category.RunningContests,
            }), false),
            new CodeforcesNode(Object.assign({}, defaultProblem, {
                id: Category.UpcomingContests,
                name: Category.UpcomingContests,
            }), false),
        ];
    }

    public getAllNodes(): CodeforcesNode[] {
        const hideSolved = shouldHideSolvedProblem();
        if (hideSolved) {
            return this.applySortingStrategy(Array.from(this.explorerNodeMap.values()).filter((node) => node.state !== ProblemState.ACCEPTED));
        }
        return this.applySortingStrategy(Array.from(this.explorerNodeMap.values()));
    }

    public getAllRatingNodes(): CodeforcesNode[] {
        const res: CodeforcesNode[] = [];
        for (const difficulty of this.difficultySet.values()) {
            res.push(new CodeforcesNode(Object.assign({}, defaultProblem, {
                id: `${Category.Rating}.${difficulty}`,
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

    public getContestNodes(filter: string[], category: Category): CodeforcesNode[] {
        const res: CodeforcesNode[] = [];
        const pastContests = Array.from(this.contests.values()).filter((contest: IContest) => {
            return filter.indexOf(contest.phase) >= 0;
        });
        for (const contest of pastContests) {
            res.push(new CodeforcesNode(Object.assign({}, defaultProblem, {
                id: `${category}.${contest.id}`,
                name: contest.name,
            }), false, contest));
        }
        switch (category) {
            case Category.PastContests:
            case Category.RunningContests:
                res.sort((a, b) => {
                    const aContest = a.contest as IContest;
                    const bContest = b.contest as IContest;
                    return bContest.startTimeSeconds - aContest.startTimeSeconds;
                });
                break;
            case Category.UpcomingContests:
                res.sort((a, b) => {
                    const aContest = a.contest as IContest;
                    const bContest = b.contest as IContest;
                    return aContest.startTimeSeconds - bContest.startTimeSeconds;
                });
                break;
        }
        return res;
    }

    public getAllPastContestNodes(): CodeforcesNode[] {
        return this.getContestNodes(["FINISHED", "PENDING_SYSTEM_TEST", "SYSTEM_TEST"], Category.PastContests);
    }

    public getAllRunningContestNodes(): CodeforcesNode[] {
        return this.getContestNodes(["CODING"], Category.RunningContests);
    }

    public getAllUpcomingContestNodes(): CodeforcesNode[] {
        return this.getContestNodes(["BEFORE"], Category.UpcomingContests);
    }

    public getNodeById(id: string): CodeforcesNode | undefined {
        return this.explorerNodeMap.get(id);
    }

    public getChildrenNodesById(id: string): CodeforcesNode[] {
        const metaInfo: string[] = id.split(".");
        const res: CodeforcesNode[] = [];
        const hideSolved = shouldHideSolvedProblem();

        for (const node of this.explorerNodeMap.values()) {
            if(hideSolved && node.state === ProblemState.ACCEPTED) {
                continue;
            }
            switch (metaInfo[0]) {
                case Category.Rating:
                    if (!node.rating && metaInfo[1] === "UNKNOWN") {
                        res.push(node);
                        break;
                    }
                    if (node.rating && node.rating.toString() === metaInfo[1]) {
                        res.push(node);
                        break;
                    }
                case Category.Tag:
                    if (node.tags.indexOf(metaInfo[1]) >= 0) {
                        res.push(node);
                        break;
                    }
                case Category.PastContests:
                    if (node.contestId === parseInt(metaInfo[1])) {
                        res.push(node);
                        break;
                    }
                case Category.RunningContests:
                    if (node.contestId === parseInt(metaInfo[1])) {
                        res.push(node);
                        break;
                    }
                case Category.UpcomingContests:
                default:
                    break;
            }
        }
        switch (metaInfo[0]) {
            case Category.Rating:
                return this.applySortingStrategy(res);
            case Category.Tag:
                return this.applySortingStrategy(res);
            case Category.PastContests:
            case Category.RunningContests:
            case Category.UpcomingContests:
                return res.sort((a, b) => {
                    return a.index.localeCompare(b.index);
                });
            default:
                return [];
        }
    }

    public dispose(): void {
        this.explorerNodeMap.clear();
        this.difficultySet.clear();
        this.tagSet.clear();
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
                }
                );
            case SortingStrategy.ContestDesc:
                return nodes.sort((a, b) => {
                    if (a.contestId === b.contestId) {
                        return a.index.localeCompare(b.index);
                    }
                    return b.contestId - a.contestId;
                }
                );
            case SortingStrategy.SolvedCountAsc:
                return nodes.sort((a, b) => {
                    if (a.solvedCount === b.solvedCount) {
                        return a.index.localeCompare(b.index);
                    }
                    return a.solvedCount - b.solvedCount;
                }
                );
            case SortingStrategy.SolvedCountDesc:
                return nodes.sort((a, b) => {
                    if (a.solvedCount === b.solvedCount) {
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
