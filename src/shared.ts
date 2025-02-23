import * as vscode from "vscode";

export interface IQuickItemEx<T> extends vscode.QuickPickItem {
    value: T;
}

export interface IContest {
    id: number;
    name: string;
    type: string;
    phase: string;
    frozen: boolean;
    durationSeconds: number;
    startTimeSeconds: number;
    relativeTimeSeconds: number;
}

export enum ProblemState {
    WRONG_ANSWER = 1,
    PARTIAL = 2,
    ACCEPTED = 3,
    UNKNOWN = 4,
}

export interface ISampleTest {
    input: {line: string, type: "even" | "odd"}[]; 
    output: {line: string, type: "even" | "odd"}[]; 
}

export interface DescLine {
    type: "paragraph" | "ul" | "ol"
    content: string | string[]
}

export interface IDescription {
    title: string;
    // statements: DescLine[];
    // input: DescLine[];
    // output: DescLine[];
    // sampleTests: ISampleTest[];
    // note: DescLine[];
    url: string;
    body: string;
    tags: string[];
    rating: string;
}

export interface IWebViewMessage {
    command: string;
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

export interface IProblemStatistics {
    contestId: number;
    index: string;
    solvedCount: number;
}

export interface ProblemsResponse {
    result: {
        problems: IProblem[];
        problemStatistics: IProblemStatistics[];
    }
}

export interface ContestsResponse {
    status: string;
    result: IContest[];
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
    Rating = "Rating",
    Tag = "Tag",
    PastContests = "Past Contests",
    UpcomingContests = "Upcoming Contests",
    RunningContests = "Running Contests",
    User = "User",
}

export enum SortingStrategy {
    None = "None",
    ContestAsc = "Contest Order (Ascending)",
    ContestDesc = "Contest Order (Descending)",
    RatingAsc = "Rating (Ascending)",
    RatingDesc = "Rating (Descending)",
    SolvedCountAsc = "Solved Count (Ascending)",
    SolvedCountDesc = "Solved Count (Descending)",
}