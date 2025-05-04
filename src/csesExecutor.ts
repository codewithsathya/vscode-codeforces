import axios from "axios";

class CsesExecutor {
    async getProblem(id: number): Promise<string> {
        const { data: html } = await axios.get(`https://www.cses.fi/problemset/task/${id}`);
        if (!html || html === "") {
            throw new Error("Failed to get problem");
        }
        return html as string;
    }
}

export const csesExecutor: CsesExecutor = new CsesExecutor();