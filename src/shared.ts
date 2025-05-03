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
    input: { line: string; type: "even" | "odd" }[];
    output: { line: string; type: "even" | "odd" }[];
}

export interface DescLine {
    type: "paragraph" | "ul" | "ol";
    content: string | string[];
}

export interface IDescription {
    title: string;
    url: string;
    body: string;
    tags: string[];
    rating: string;
    timeLimit: string;
    memoryLimit: string;
}

export enum DescriptionConfiguration {
    InWebView = "In Webview",
    InFileComment = "In File Comment",
    Both = "Both",
    None = "None",
}

export interface IDescriptionConfiguration {
    showInComment: boolean;
    showInWebview: boolean;
}

export interface IWebViewMessage {
    command: string;
    tag?: string;
}

export interface IProblem {
    id: string;
    state: ProblemState;
    contestId: number;
    index: string;
    name: string;
    rating?: number;
    tags: string[];
    solvedCount: number;
    platform: string;
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
    };
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
    platform: "codeforces",
};

export enum Category {
    All = "All",
    Rating = "Rating",
    Tag = "Tag",
    PastContests = "Past Contests",
    UpcomingContests = "Upcoming Contests",
    RunningContests = "Running Contests",
    CSES = "CSES",
    CP31 = "CP-31",
    A2OJ = "A2OJ",
    User = "User",
}

export const UNKNOWN_RATING = "UNKNOWN";

export enum SortingStrategy {
    None = "None",
    ContestAsc = "Contest Order (Ascending)",
    ContestDesc = "Contest Order (Descending)",
    RatingAsc = "Rating (Ascending)",
    RatingDesc = "Rating (Descending)",
    SolvedCountAsc = "Solved Count (Ascending)",
    SolvedCountDesc = "Solved Count (Descending)",
}

export type Tags = Record<string, Record<string, string[]> | string[]>;

export type CodeforcesTree = {
    All?: string[];
    Rating?: Record<string, string[]>;
    Tag?: Tags;
    "Past Contests"?: Record<string, string[]>;
    "Running Contests"?: Record<string, string[]>;
    "Upcoming Contests"?: Record<string, string[]>;
    "CSES"?: Record<string, string[]>;
    "CP-31"?: Record<string, string[]>;
    "A2OJ"?: Record<string, string[]>;
}