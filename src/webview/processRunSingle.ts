import { Problem, RunResult } from "../cph/types";
import { getLanguage } from "../cph/utils";
import { getBinSaveLocation, compileFile } from "../cph/compiler";
import { saveProblem } from "../cph/parser";
import { runTestCase, deleteBinary } from "../cph/executions";
import { isResultCorrect } from "../cph/judge";
import * as vscode from "vscode";
import { getIgnoreSTDERRORPref } from "../cph/preferences";
import { judgeViewProvider } from "./judgeViewProvider";

export const runSingleAndSave = async (
    problem: Problem,
    id: number,
    skipCompile = false,
) => {
    const srcPath = problem.srcPath;
    const language = getLanguage(srcPath);
    const binPath = getBinSaveLocation(srcPath);
    const idx = problem.tests.findIndex((value) => value.id === id);
    const testCase = problem.tests[idx];

    const textEditor = await vscode.workspace.openTextDocument(srcPath);
    await vscode.window.showTextDocument(textEditor, vscode.ViewColumn.One);
    await textEditor.save();

    if (!testCase) {
        return;
    }

    saveProblem(srcPath, problem);

    if (!skipCompile) {
        if (!(await compileFile(srcPath))) {
            return;
        }
    }

    const run = await runTestCase(language, binPath, testCase.input);

    if (!skipCompile) {
        deleteBinary(language, binPath);
    }

    const stderrorFailure = getIgnoreSTDERRORPref() ? false : run.stderr !== "";

    const didError =
        (run.code !== null && run.code !== 0) ||
        run.signal !== null ||
        stderrorFailure;
    const result: RunResult = {
        ...run,
        pass: didError ? false : isResultCorrect(testCase, run.stdout),
        id,
    };

    judgeViewProvider.extensionToJudgeViewMessage({
        command: "run-single-result",
        result,
        problem,
    });
};
