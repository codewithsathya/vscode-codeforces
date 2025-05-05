import { ContestsResponse, IContest, IProblem, ProblemState } from "../shared";
import axiosClient from "axios";
import {
    ProblemsResponse,
} from "../shared";
import { getCodeforcesHandle } from "./plugin";
import { shouldHideSolvedProblem } from "../utils/settingUtils";
import { JSDOM } from "jsdom";
import { globalState } from "../globalState";
import { codeforcesChannel } from "../codeforcesChannel";
import { DialogType, promptForOpenOutputChannel } from "../utils/uiUtils";

export async function listCodeforcesProblems(): Promise<IProblem[]> {
    try {
        return await globalState.getWithBackgroundRefresh<IProblem[]>("codeforcesProblems", async () => {
            const { data }: { data: ProblemsResponse } = await axiosClient.get(
                "https://codeforces.com/api/problemset.problems"
            );

            const { problems, problemStatistics } = data.result;

            const problemsMap = problems.reduce<Record<string, IProblem>>((map, problem) => {
                const id = `${problem.contestId}:${problem.index}`;
                map[id] = {
                    ...problem,
                    id,
                    state: ProblemState.UNKNOWN,
                    platform: "codeforces"
                };
                return map;
            }, {});

            for (const { contestId, index, solvedCount } of problemStatistics) {
                const id = `${contestId}:${index}`;
                if (problemsMap[id]) {
                    problemsMap[id].solvedCount = solvedCount;
                }
            }

            const handle = getCodeforcesHandle();
            if (handle && handle.length > 0) {
                const { data } = await axiosClient.get(
                    `https://codeforces.com/api/user.status?handle=${handle}`
                ) as { data: any };

                for (const submission of data.result) {
                    const id = `${submission.problem.contestId}:${submission.problem.index}`;
                    const problem = problemsMap[id];
                    if (problem) {
                        problem.state =
                            submission.verdict === "OK"
                                ? ProblemState.ACCEPTED
                                : ProblemState.WRONG_ANSWER;
                    }
                }
            }

            let problemsList = Object.values(problemsMap);
            if (shouldHideSolvedProblem()) {
                problemsList = problemsList.filter(
                    (problem) => problem.state !== ProblemState.ACCEPTED
                );
            }

            return problemsList;
        });
    } catch (error) {
        codeforcesChannel.appendLine(`Failed to list Codeforces problems: ${error}`);
        promptForOpenOutputChannel(`Failed to list codeforces problems`, DialogType.error);
        return [];
    }
}

export async function listCodeforcesContests(): Promise<IContest[]> {
    try {
        return await globalState.getWithBackgroundRefresh<IContest[]>("codeforcesContests", async () => {
            const { data: contestsData } = await axiosClient.get(
                "https://codeforces.com/api/contest.list"
            ) as { data: ContestsResponse };
            return contestsData.result;
        });
    } catch (error) {
        codeforcesChannel.appendLine(`Failed to list Codeforces contests: ${error}`);
        promptForOpenOutputChannel(`Failed to list codeforces contests`, DialogType.error);
        return [];
    }
}

export async function listCsesProblems(): Promise<Record<string, IProblem[]>> {
    try {
        return await globalState.getWithBackgroundRefresh<Record<string, IProblem[]>>(
            "csesProblems",
            async () => {
                const { data: htmlPage } = await axiosClient.get("https://www.cses.fi/problemset/list/");
                const jsdom = new JSDOM(htmlPage as string);
                const content = jsdom.window.document.querySelectorAll(".content");

                const nodes = [];
                for (let i = 3; i < content[0].children.length - 3; i++) {
                    nodes.push(content[0].children[i]);
                }

                const problems: Record<string, IProblem[]> = {};
                for (let i = 0; i < nodes.length; i += 2) {
                    const titleNode = nodes[i];
                    const title = titleNode.textContent?.trim() ?? "Untitled";
                    const problemsNode = nodes[i + 1];
                    const problemNodes = problemsNode.children;
                    problems[title] = [];

                    for (let j = 0; j < problemNodes.length; j++) {
                        const problemNode = problemNodes[j];
                        const anchor = problemNode.querySelector("a");
                        const detail = problemNode.querySelector(".detail");

                        if (!anchor || !detail) continue;

                        const problemName = anchor.textContent?.trim() ?? "Unknown";
                        const problemLink = anchor.getAttribute("href") ?? "";
                        const solvedText = detail.textContent ?? "0 / ?";
                        const solvedCount = parseInt(solvedText.split("/")[0].trim());
                        const problemId = problemLink.split("/").pop() ?? "0";

                        const problem: IProblem = {
                            isFavorite: false,
                            id: `${problemId}:cses`,
                            name: problemName,
                            contestId: parseInt(problemId),
                            index: "cses",
                            state: ProblemState.UNKNOWN,
                            tags: [],
                            solvedCount,
                            platform: "cses",
                        };

                        problems[title].push(problem);
                    }
                }

                return problems;
            }
        );
    } catch (error) {
        codeforcesChannel.appendLine(`Failed to list CSES problems: ${error}`);
        promptForOpenOutputChannel("Failed to list CSES problems", DialogType.error);
        return {};
    }
}

