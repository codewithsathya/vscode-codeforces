export enum ProblemState {
    WRONG_ANSWER = 1,
    PARTIAL = 2,
    ACCEPTED = 3,
    UNKNOWN = 4,
}

export interface IProblem {
    id: string;
    state: ProblemState;
    contestId: number;
    index: string;
    name: string;
    rating: number | undefined;
    tags: string[];
    solvedCount: number;
}

export const defaultProblem: IProblem = {
    id: "",
    state: ProblemState.UNKNOWN,
    contestId: 0,
    index: "",
    name: "",
    rating: undefined,
    tags: [],
    solvedCount: 0,
};

export enum Category {
    All = "All",
    Difficulty = "Difficulty",
    Tag = "Tag",
}