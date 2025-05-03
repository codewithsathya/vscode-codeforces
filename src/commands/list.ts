import { ContestsResponse, IContest, IProblem, ProblemState } from "../shared";
import axiosClient from "axios";
import {
    ProblemsResponse,
} from "../shared";
import { getCodeforcesHandle } from "./plugin";

export async function listCodeforcesProblems(): Promise<IProblem[]> {
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
        const { data } = (await axiosClient.get(
            `https://codeforces.com/api/user.status?handle=${handle}`,
        )) as { data: any };
        for (const submission of data.result) {
            const id = `${submission.problem.contestId}:${submission.problem.index}`;
            const problem = problemsMap[id];
            if (problem) {
                if (submission.verdict === "OK") {
                    problemsMap[id].state = ProblemState.ACCEPTED;
                } else {
                    problemsMap[id].state = ProblemState.WRONG_ANSWER;
                }
            }
        }
    }

    return Object.values(problemsMap);
}

export async function listCodeforcesContests(): Promise<IContest[]> {
    const { data: contestsData } = (await axiosClient.get(
        "https://codeforces.com/api/contest.list",
    )) as { data: ContestsResponse };
    return contestsData.result;
}

