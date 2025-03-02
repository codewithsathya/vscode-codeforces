import { Problem } from "../cph/types";
import { runSingleAndSave } from "./processRunSingle";
import { compileFile, getBinSaveLocation } from "../cph/compiler";
import { deleteBinary } from "../cph/executions";
import { getLanguage } from "../cph/utils";
import { judgeViewProvider } from "./judgeViewProvider";

/**
 * Run every testcase in a problem one by one. Waits for the first to complete
 * before running next. `runSingleAndSave` takes care of saving.
 **/
export default async (problem: Problem) => {
    // globalThis.logger.log('Run all started', problem);
    const didCompile = await compileFile(problem.srcPath);
    if (!didCompile) {
        return;
    }
    for (const testCase of problem.tests) {
        judgeViewProvider.extensionToJudgeViewMessage({
            command: "running",
            id: testCase.id,
            problem: problem,
        });
        await runSingleAndSave(problem, testCase.id, true);
    }
    // globalThis.logger.log('Run all finished');
    deleteBinary(
        getLanguage(problem.srcPath),
        getBinSaveLocation(problem.srcPath),
    );
};
