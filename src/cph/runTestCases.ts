import path from "path";

import * as vscode from "vscode";

import runAllAndSave from "../webview/processRunAll";
import { judgeViewProvider } from "../webview/judgeViewProvider";

import { checkUnsupported, randomId } from "./utils";
import { Problem } from "./types";
import { getProblem, saveProblem } from "./parser";
import { compileFile } from "./compiler";

/**
 * Execution for the run testcases command. Runs all testcases for the active
 * editor. If the active editor does not have any saved testaces, presents an
 * option to the user to either download them from a codeforces URL or manually
 * create an empty testcases file and show it in the results section.
 */
export default async () => {
    // globalThis.logger.log('Running command "runTestCases"');
    const editor = vscode.window.activeTextEditor;
    if (editor === undefined) {
        checkUnsupported("");
        return;
    }
    const srcPath = editor.document.fileName;
    if (checkUnsupported(srcPath)) {
        return;
    }

    const problem = getProblem(srcPath);

    if (!problem) {
        // globalThis.logger.log('No problem saved.');
        createLocalProblem(editor);
        return;
    }

    const didCompile = await compileFile(srcPath);

    if (!didCompile) {
        // globalThis.logger.error('Could not compile', srcPath);
        return;
    }
    await editor.document.save();
    judgeViewProvider.focus();
    judgeViewProvider.extensionToJudgeViewMessage({
        command: "new-problem",
        problem: problem,
    });
    runAllAndSave(problem);
    vscode.window.showTextDocument(editor.document, vscode.ViewColumn.One);
};

const createLocalProblem = async (editor: vscode.TextEditor) => {
    // globalThis.logger.log('Creating local problem');
    const srcPath = editor.document.fileName;
    if (checkUnsupported(srcPath)) {
        return;
    }

    const newProblem: Problem = {
        name: "Local: " + path.basename(srcPath).split(".")[0],
        url: srcPath,
        tests: [
            {
                id: randomId(),
                input: "",
                output: "",
            },
        ],
        interactive: false,
        memoryLimit: 1024,
        timeLimit: 3000,
        srcPath,
        group: "local",
        local: true,
    };
    // globalThis.logger.log(newProblem);
    saveProblem(srcPath, newProblem);
    judgeViewProvider.focus();
    judgeViewProvider.extensionToJudgeViewMessage({
        command: "new-problem",
        problem: newProblem,
    });
};
