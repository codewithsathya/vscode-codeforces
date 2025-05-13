import { codeforcesChannel } from "./codeforcesChannel";
import axios from "axios";

class CodeforcesExecutor {
    async getProblem(contestId: number, index: string): Promise<string> {
        try {
            const { data: html } = await axios.get(
                `https://codewithsathya.github.io/codeforces-problems/content/${contestId}:${index}.html`,
            );
            if (!html || html === "") {
                throw new Error("Failed to get problem");
            }
            return html as string;
        } catch (error) {
            codeforcesChannel.appendLine(`Failed to get codeforces problem details: ${error}`);
            return "";
        }
    }
}

export const codeforcesExecutor: CodeforcesExecutor = new CodeforcesExecutor();
