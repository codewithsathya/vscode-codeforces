import { previewProblem } from "../commands/show";
import { Problem } from "../cph/types";
import { explorerNodeManager } from "../explorer/explorerNodeManager";
import { getNodeIdFromUrl } from "../utils/urlUtils";

export const showDescription = async (problem: Problem) => {
    const nodeId = getNodeIdFromUrl(problem.url);
    if(nodeId === "") {
        return;
    }
    const node = explorerNodeManager.getNodeById(nodeId);
    previewProblem(node, true);
};