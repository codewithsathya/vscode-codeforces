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
    isFavorite: boolean;
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
    isFavorite: false,
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
    Favorite = "Favorite",
    PastContests = "Past Contests",
    UpcomingContests = "Upcoming Contests",
    RunningContests = "Running Contests",
    CSES = "CSES Problemset",
    CP31 = "CP-31 Sheet",
    A2OJ = "A2OJ Ladders",
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
    [Category.All]?: string[];
    [Category.Rating]?: Record<string, string[]>;
    [Category.Tag]?: Tags;
    [Category.Favorite]?: string[];
    [Category.PastContests]?: Record<string, string[]>;
    [Category.RunningContests]?: Record<string, string[]>;
    [Category.UpcomingContests]?: Record<string, string[]>;
    [Category.CSES]?: Record<string, string[]>;
    [Category.CP31]?: Record<string, string[]>;
    [Category.A2OJ]?: Record<string, string[]>;
}