/** Valid name for a VS Code preference section for the extension */
export type prefSection =
    | "general.saveLocation"
    | "general.defaultLanguage"
    | "general.timeOut"
    | "general.hideStderrorWhenCompiledOK"
    | "general.ignoreSTDERROR"
    | "general.firstTime"
    | "general.useShortCodeForcesName"
    | "general.menuChoices"
    | "language.c.Args"
    | "language.c.SubmissionCompiler"
    | "language.c.Command"
    | "language.c.OutputArg"
    | "language.cpp.Args"
    | "language.cpp.SubmissionCompiler"
    | "language.cpp.Command"
    | "language.cpp.OutputArg"
    | "language.csharp.Args"
    | "language.csharp.SubmissionCompiler"
    | "language.csharp.Command"
    | "language.go.Args"
    | "language.go.SubmissionCompiler"
    | "language.go.Command"
    | "language.rust.Args"
    | "language.rust.SubmissionCompiler"
    | "language.rust.Command"
    | "language.java.Args"
    | "language.java.SubmissionCompiler"
    | "language.java.Command"
    | "language.js.Args"
    | "language.js.SubmissionCompiler"
    | "language.js.Command"
    | "language.python.Args"
    | "language.python.SubmissionCompiler"
    | "language.python.Command"
    | "language.ruby.Args"
    | "language.ruby.SubmissionCompiler"
    | "language.ruby.Command"
    | "language.haskell.Args"
    | "language.haskell.SubmissionCompiler"
    | "language.haskell.Command"
    | "general.retainWebviewContext"
    | "general.autoShowJudge"
    | "general.defaultLanguageTemplateFileLocation";

export type Language = {
    name: LangNames;
    compiler: string;
    args: string[];
    skipCompile: boolean;
};

export type LangNames =
    | "python"
    | "ruby"
    | "c"
    | "cpp"
    | "rust"
    | "java"
    | "js"
    | "go"
    | "hs"
    | "csharp";

export type TestCase = {
    input: string;
    output: string;
    id: number;
};

export type Problem = {
    name: string;
    url: string;
    interactive: boolean;
    memoryLimit: number;
    timeLimit: number;
    group: string;
    tests: TestCase[];
    srcPath: string;
    local?: boolean;
};

export type Case = {
    id: number;
    result: RunResult | null;
    testcase: TestCase;
};

export type Run = {
    stdout: string;
    stderr: string;
    code: number | null;
    signal: string | null;
    time: number;
    timeOut: boolean;
};

export type RunResult = {
    pass: boolean | null;
    id: number;
} & Run;

export type WebviewMessageCommon = {
    problem: Problem;
};

export type RunSingleCommand = {
    command: "run-single-and-save";
    id: number;
} & WebviewMessageCommon;

export type RunAllCommand = {
    command: "run-all-and-save";
} & WebviewMessageCommon;

export type OnlineJudgeEnv = {
    command: "online-judge-env";
    value: boolean;
};

export type KillRunningCommand = {
    command: "kill-running";
} & WebviewMessageCommon;

export type SaveCommand = {
    command: "save";
} & WebviewMessageCommon;

export type DeleteTcsCommand = {
    command: "delete-tcs";
} & WebviewMessageCommon;

export type SubmitCf = {
    command: "submitCf";
} & WebviewMessageCommon;

export type SubmitCses = {
    command: "submitCses";
} & WebviewMessageCommon;

export type GetInitialProblem = {
    command: "get-initial-problem";
};

export type CreateLocalProblem = {
    command: "create-local-problem";
};

export type OpenUrl = {
    command: "url";
    url: string;
};

export type GetExtLogs = {
    command: "get-ext-logs";
};

export type ShowDescription = {
    command: "show-description";
} & WebviewMessageCommon;

export type WebviewToVSEvent =
    | RunAllCommand
    | GetInitialProblem
    | CreateLocalProblem
    | RunSingleCommand
    | KillRunningCommand
    | SaveCommand
    | DeleteTcsCommand
    | SubmitCf
    | SubmitCses
    | OnlineJudgeEnv
    | OpenUrl
    | GetExtLogs
    | ShowDescription;

export type RunningCommand = {
    command: "running";
    id: number;
} & WebviewMessageCommon;

export type NotRunningCommand = {
    command: "not-running";
};

export type ResultCommand = {
    command: "run-single-result";
    result: RunResult;
} & WebviewMessageCommon;

export type CompilingStartCommand = {
    command: "compiling-start";
};

export type CompilingStopCommand = {
    command: "compiling-stop";
};

export type RunAllInWebViewCommand = {
    command: "run-all";
};

export type WaitingForSubmitCommand = {
    command: "waiting-for-submit";
};

export type SubmitFinishedCommand = {
    command: "submit-finished";
};

export type NewProblemCommand = {
    command: "new-problem";
    problem: Problem | undefined;
};

export type ExtLogsCommand = {
    command: "ext-logs";
    logs: string;
};

export type Status = {
    verdict: string;
    time: string;
    memory: string;
};

export type TrackingVerdictCommand = {
    command: "tracking-verdict";
    message: Status;
};

export type VSToWebViewMessage =
    | ResultCommand
    | RunningCommand
    | RunAllInWebViewCommand
    | CompilingStartCommand
    | CompilingStopCommand
    | WaitingForSubmitCommand
    | SubmitFinishedCommand
    | NotRunningCommand
    | NewProblemCommand
    | ExtLogsCommand
    | TrackingVerdictCommand;

export type CphEmptyResponse = {
    empty: true;
};

export type CphSubmitResponse = {
    url: string;
    empty: false;
    problemName: string;
    sourceCode: string;
    languageId: number;
};

export type CphCsesSubmitResponse = {
    url: string,
    empty: false;
    sourceCode: string;
    languageId: string;
    fileName: string;
}

export type WebViewpersistenceState = {
    dialogCloseDate: number;
};

declare global {
    var logger: any;
}
