import axios from "axios";

import { globalState } from "../globalState";
import { CodeforcesSolution } from "../shared";
import { sleep } from "../utils/osUtils";
import { getSolutionHandles } from "../utils/settingUtils";
import { codeforcesChannel } from "../codeforcesChannel";

async function getHandleSolutions(username: string) {
    try {
        const result: Record<string, CodeforcesSolution> = {};
        const { data: handleDetails }: any = await axios.get(
            `https://codeforces.com/api/user.status?handle=${username}`,
        );
        for (const submission of handleDetails.result) {
            if (submission.verdict !== "OK") {
                continue;
            }
            const { contestId, index } = submission.problem;
            const submissionId = submission.id;
            const timeSubmitted = submission.creationTimeSeconds;
            const problemId = `${contestId}:${index}`;
            if (
                !result[problemId] ||
                (result[problemId] &&
                    result[problemId].timeSubmitted < timeSubmitted)
            ) {
                result[problemId] = {
                    username,
                    contestId,
                    index,
                    submissionId,
                    timeSubmitted,
                };
            }
        }
        return result;
    } catch (error) {
        throw new Error(`Failed to get ${username} solutions: ${error}`);
    }
}

export async function saveSolutionDetails() {
    const handles = getSolutionHandles();
    const solutionDetails: Record<string, CodeforcesSolution[]> = {};
    try {
        for (const handle of handles) {
            const solutionMap = await getHandleSolutions(handle);
            for (const [id, solution] of Object.entries(solutionMap)) {
                if (!solutionDetails[id]) {
                    solutionDetails[id] = [];
                }
                solutionDetails[id].push(solution);
            }
            codeforcesChannel.appendLine(
                `Collected solution details of ${handle}`,
            );
            await sleep(1000);
        }
        await globalState.setSolutionDetails(solutionDetails);
    } catch (error) {
        codeforcesChannel.appendLine(`Failed to collect solutions: ${error}`);
    }
}

export function getSolutions(problemId: string): CodeforcesSolution[] {
    const solutionDetails = globalState.getSolutionDetails();
    if (!solutionDetails || !solutionDetails[problemId]) {
        return [];
    }
    return solutionDetails[problemId];
}
