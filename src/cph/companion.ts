import http from "http";
import * as fs from "fs";
import path from "path";
import { writeFileSync, readFileSync, existsSync } from "fs";

import * as vscode from "vscode";

import { judgeViewProvider } from "../webview/judgeViewProvider";
import { CodeforcesNode } from "../explorer/CodeforcesNode";
import {
    CodeforcesSolution,
    IDescriptionConfiguration,
    IProblem,
} from "../shared";
import { codeforcesPreviewProvider } from "../webview/codeforcesPreviewProvider";
import {
    getDescriptionConfiguration,
    showSolutionLinks,
} from "../utils/settingUtils";
import { codeforcesChannel } from "../codeforcesChannel";
import { getSolutions } from "../commands/solutions";
import { globalState } from "../globalState";

import { words_in_text } from "./utilsPure";
import { getProblemName } from "./submit";
import {
    getDefaultLangPref,
    useShortCodeForcesName,
    getMenuChoices,
    getDefaultLanguageTemplateFileLocation,
    getCsesLanguageId,
} from "./preferences";
import { getLanguageId } from "./preferences";
import { isCodeforcesUrl, randomId } from "./utils";
import { saveProblem } from "./parser";
import { CphCsesSubmitResponse, CphEmptyResponse, CphSubmitResponse, Problem } from "./types";
import config from "./config";
import { codeforcesTreeDataProvider } from "../explorer/codeforcesTreeDataProvider";


const emptyResponse: CphEmptyResponse = { empty: true };
let savedResponse: CphEmptyResponse | CphSubmitResponse | CphCsesSubmitResponse = emptyResponse;

export const getProblemFileName = (problem: Problem, ext: string) => {
    if (isCodeforcesUrl(new URL(problem.url)) && useShortCodeForcesName()) {
        return `${getProblemName(problem.url)}.${ext}`;
    } else {
        const words = words_in_text(problem.name);
        if (words === null) {
            return `${problem.name.replace(/\W+/g, "_")}.${ext}`;
        } else {
            return `${words.join("_")}.${ext}`;
        }
    }
};

export const submitProblem = async (problem: Problem) => {
    const srcPath = problem.srcPath;
    const problemName = getProblemName(problem.url);
    const sourceCode = fs.readFileSync(srcPath).toString();
    const languageId = getLanguageId(problem.srcPath);
    savedResponse = {
        empty: false,
        url: problem.url,
        problemName,
        sourceCode,
        languageId,
    };
};

export const submitCsesProblem = async (problem: Problem) => {
    const srcPath = problem.srcPath;
    const languageId = getCsesLanguageId(srcPath);
    const sourceCode = fs.readFileSync(srcPath).toString();
    savedResponse = {
        empty: false,
        url: problem.url,
        languageId,
        sourceCode,
        fileName: path.basename(srcPath)
    };
};

export const setupCompanionServer = () => {
    try {
        const server = http.createServer((req, res) => {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            res.setHeader("Access-Control-Allow-Headers", "Content-Type, cph-submit");

            if (req.method === "OPTIONS") {
                res.writeHead(204);
                res.end();
                return;
            }

            const { headers } = req;
            let rawProblem = "";
            let csesData = "";

            req.on("data", (chunk) => {
                if(!headers["cph-submit"]) {
                    rawProblem += chunk;
                } else if(headers["cph-submit"] === "true") {
                    csesData += chunk;
                }
            });

            req.on("end", () => {
                try {
                    if (rawProblem !== "") {
                        const problem: Problem = JSON.parse(rawProblem);
                        handleNewProblem(problem);
                    }
                } catch (e) {
                    vscode.window.showErrorMessage(
                        `Error parsing problem from companion "${e}. Raw problem: '${rawProblem}'"`,
                    );
                }

                if (csesData !== "") {
                    handleCsesStatusData(csesData);
                }

                res.write(JSON.stringify(savedResponse));

                if (headers["cph-submit"] === "true") {
                    if (savedResponse.empty !== true) {
                        judgeViewProvider.extensionToJudgeViewMessage({
                            command: "submit-finished",
                        });
                    }
                    savedResponse = emptyResponse;
                }

                res.end();
            });
        });
        server.listen(config.port);
        server.on("error", (err) => {
            vscode.window.showErrorMessage(
                `Are multiple VSCode windows open? CPH will work on the first opened window. CPH server encountered an error: "${err.message}" , companion may not work.`,
            );
        });
        return server;
    } catch (e) {
        codeforcesChannel.appendLine(`Companion server error: ${e}`);
    }
};

/** Handle the `problem` sent by Competitive Companion, such as showing the webview, opening an editor, managing layout etc. */
export const handleNewProblem = async (
    problem: Problem,
    node?: CodeforcesNode,
    html?: string,
): Promise<void> => {
    // If webview may be focused, close it, to prevent layout bug.
    if (vscode.window.activeTextEditor === undefined) {
        judgeViewProvider.extensionToJudgeViewMessage({
            command: "new-problem",
            problem: undefined,
        });
    }
    const folder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (folder === undefined) {
        vscode.window.showInformationMessage("Please open a folder first.");
        return;
    }
    const defaultLanguage = getDefaultLangPref();
    let extn: string;

    if (defaultLanguage === null) {
        const allChoices = new Set(Object.keys(config.extensions));
        const userChoices = getMenuChoices();
        const choices = userChoices.filter((x) => allChoices.has(x));
        const selected = await vscode.window.showQuickPick(choices);
        if (!selected) {
            vscode.window.showInformationMessage(
                "Aborted creation of new file",
            );
            return;
        }
        // @ts-ignore
        extn = config.extensions[selected];
    } else {
        //@ts-ignore
        extn = config.extensions[defaultLanguage];
    }
    const problemFileName = getProblemFileName(problem, extn);
    const srcPath = path.join(folder, problemFileName);

    // Add fields absent in competitive companion.
    problem.srcPath = srcPath;
    problem.tests = problem.tests.map((testcase) => ({
        ...testcase,
        id: randomId(),
    }));
    if (!existsSync(srcPath)) {
        writeFileSync(srcPath, "");
    }
    saveProblem(srcPath, problem);
    const doc = await vscode.workspace.openTextDocument(srcPath);

    if (defaultLanguage) {
        const templateLocation = getDefaultLanguageTemplateFileLocation();
        if (templateLocation !== null) {
            const templateExists = existsSync(templateLocation);
            if (!templateExists) {
                vscode.window.showErrorMessage(
                    `Template file does not exist: ${templateLocation}`,
                );
            } else {
                let templateContents =
                    readFileSync(templateLocation).toString();

                if (extn === "java") {
                    const className = path.basename(problemFileName, ".java");
                    templateContents = templateContents.replace(
                        "CLASS_NAME",
                        className,
                    );
                }
                writeFileSync(srcPath, templateContents);
            }
        }
    }

    await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
    const descriptionConfig: IDescriptionConfiguration =
        getDescriptionConfiguration();
    if (descriptionConfig.showInWebview && html && node) {
        showDescriptionView(html, node.data);
    }
    judgeViewProvider.extensionToJudgeViewMessage({
        command: "new-problem",
        problem,
    });
};

export const handleCsesStatusData = async (data: string) => {
    try {
        const { csesStatus } = JSON.parse(data) as { csesStatus: Record<string, boolean> };
        if(!csesStatus) {
            return;
        }
        const updated = await globalState.setCsesStatus(csesStatus);
        if(updated) {
            await codeforcesTreeDataProvider.refresh();
        }
    } catch (error) {
        codeforcesChannel.appendLine(`Failed to save cses status data: ${error}`);
    }
};

async function showDescriptionView(
    html: string,
    problem: IProblem,
): Promise<void> {
    let solutions: CodeforcesSolution[] = [];
    if (showSolutionLinks()) {
        solutions = getSolutions(problem.id);
    }
    codeforcesPreviewProvider.show(html, problem, true, solutions);
}
