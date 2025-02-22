import { Command, Uri } from "vscode";
import { IProblem, ProblemState } from "../shared";
import { toInteger } from "lodash";

export class CodeforcesNode {
    constructor(
        private data: IProblem,
        private isProblemNode: boolean = true,
    ) {}

    public get state(): ProblemState {
        return this.data.state;
    }

    public get contestId(): number {
        return this.data.contestId;
    }

    public get index(): string {
        return this.data.index;
    }

    public get name(): string {
        return this.data.name;
    }

    public get rating(): number | undefined {
        return this.data.rating;
    }

    public get tags(): string[] {
        return this.data.tags;
    }

    public get isProblem(): boolean {
        return this.isProblemNode;
    }

    public get id(): string {
        return this.data.id;
    }

    public set id(id: string) {
        this.data.id = id;
    }

    public get solvedCount(): number {
        return this.data.solvedCount;
    }

    public get previewCommand(): Command {
        return {
            title: "Preview Problem",
            command: "leetnotion.previewProblem",
            arguments: [this],
        };
    }

    public get uri(): Uri {
        return Uri.from({
            scheme: "codeforces",
            authority: this.isProblem ? "problems" : "tree-node",
            path: `/${this.id}`,
            query: `rating=${this.rating}`,
        });
    }
}
