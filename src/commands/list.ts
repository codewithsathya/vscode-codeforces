import axiosClient from "axios";
import * as cheerio from "cheerio";

import { shouldHideSolvedProblem } from "../utils/settingUtils";
import { ProblemsResponse } from "../shared";
import { ContestsResponse, IContest, IProblem, ProblemState } from "../shared";
import { globalState } from "../globalState";
import { codeforcesChannel } from "../codeforcesChannel";
import { DialogType, promptForOpenOutputChannel } from "../utils/uiUtils";

import { getCodeforcesHandle } from "./plugin";

export async function listCodeforcesProblems(): Promise<IProblem[]> {
    try {
        return await globalState.getWithBackgroundRefresh<IProblem[]>(
            "codeforcesProblems",
            async () => {
                const { data }: { data: ProblemsResponse } =
                    await axiosClient.get(
                        "https://codeforces.com/api/problemset.problems",
                    );

                const { problems, problemStatistics } = data.result;

                const problemsMap = problems.reduce<Record<string, IProblem>>(
                    (map, problem) => {
                        const id = `${problem.contestId}:${problem.index}`;
                        map[id] = {
                            ...problem,
                            id,
                            state: ProblemState.UNKNOWN,
                            platform: "codeforces",
                        };
                        return map;
                    },
                    {},
                );

                for (const {
                    contestId,
                    index,
                    solvedCount,
                } of problemStatistics) {
                    const id = `${contestId}:${index}`;
                    if (problemsMap[id]) {
                        problemsMap[id].solvedCount = solvedCount;
                    }
                }

                const handle = getCodeforcesHandle();
                if (handle && handle.length > 0) {
                    const { data } = (await axiosClient.get(
                        `https://codeforces.com/api/user.status?handle=${handle}`,
                    )) as { data: any };

                    for (const submission of data.result) {
                        const { contestId, index } = submission.problem as {
                            contestId: number;
                            index: string;
                        };
                        const id = `${contestId}:${index}`;
                        const status =
                            submission.verdict === "OK"
                                ? ProblemState.ACCEPTED
                                : ProblemState.WRONG_ANSWER;
                        const problem = problemsMap[id];

                        if (
                            problem &&
                            problem.state !== ProblemState.ACCEPTED
                        ) {
                            problem.state = status;
                        }
                    }
                }

                let problemsList = Object.values(problemsMap);
                if (shouldHideSolvedProblem()) {
                    problemsList = problemsList.filter(
                        (problem) => problem.state !== ProblemState.ACCEPTED,
                    );
                }

                return problemsList;
            },
        );
    } catch (error) {
        codeforcesChannel.appendLine(
            `Failed to list Codeforces problems: ${error}`,
        );
        promptForOpenOutputChannel(
            `Failed to list codeforces problems`,
            DialogType.error,
        );
        return [];
    }
}

export async function listCodeforcesContests(): Promise<IContest[]> {
    try {
        return await globalState.getWithBackgroundRefresh<IContest[]>(
            "codeforcesContests",
            async () => {
                const { data: contestsData } = (await axiosClient.get(
                    "https://codeforces.com/api/contest.list",
                )) as { data: ContestsResponse };
                return contestsData.result;
            },
        );
    } catch (error) {
        codeforcesChannel.appendLine(
            `Failed to list Codeforces contests: ${error}`,
        );
        promptForOpenOutputChannel(
            `Failed to list codeforces contests`,
            DialogType.error,
        );
        return [];
    }
}

export async function listCsesProblems(): Promise<Record<string, IProblem[]>> {
    try {
        return await globalState.getWithBackgroundRefresh<
            Record<string, IProblem[]>
        >("csesProblems", async () => {
            const { data: htmlPage } = await axiosClient.get(
                "https://www.cses.fi/problemset/list/",
            );
            const $ = cheerio.load(htmlPage as string);

            const contentChildren = $(".content").first().children().toArray();

            const nodes = contentChildren.slice(3, contentChildren.length - 3);

            const problems: Record<string, IProblem[]> = {};
            const csesStatus = globalState.getCsesStatus();
            console.log("Listing cses problems", csesStatus);
            for (let i = 0; i < nodes.length; i += 2) {
                const titleNode = $(nodes[i]);
                const title = titleNode.text().trim() || "Untitled";

                const problemsNode = $(nodes[i + 1]);
                const problemNodes = problemsNode.children().toArray();

                problems[title] = [];

                for (const problemEl of problemNodes) {
                    const problemNode = $(problemEl);
                    const anchor = problemNode.find("a").first();
                    const detail = problemNode.find(".detail").first();

                    if (!anchor.length || !detail.length) {
                        continue;
                    }

                    const problemName = anchor.text().trim();
                    const problemLink = anchor.attr("href") ?? "";
                    const solvedText = detail.text() ?? "0 / ?";
                    const solvedCount = parseInt(
                        solvedText.split("/")[0].trim(),
                    );
                    const problemId = problemLink.split("/").pop() ?? "0";
                    let state: ProblemState = ProblemState.UNKNOWN;
                    if(csesStatus[problemId] === true) {
                        state = ProblemState.ACCEPTED;
                    } else if (csesStatus[problemId] === false) {
                        state = ProblemState.WRONG_ANSWER;
                    }
                    const problem: IProblem = {
                        isFavorite: false,
                        id: `${problemId}:cses`,
                        name: problemName,
                        contestId: parseInt(problemId),
                        index: "cses",
                        state,
                        tags: [],
                        solvedCount,
                        platform: "cses",
                    };

                    problems[title].push(problem);
                }
            }

            return problems;
        });
    } catch (error) {
        codeforcesChannel.appendLine(`Failed to list CSES problems: ${error}`);
        promptForOpenOutputChannel(
            "Failed to list CSES problems",
            DialogType.error,
        );
        return {};
    }
}
