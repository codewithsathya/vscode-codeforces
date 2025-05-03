import { CodeforcesNode } from "../explorer/CodeforcesNode";
import { codeforcesTreeDataProvider } from "../explorer/codeforcesTreeDataProvider";
import { globalState } from "../globalState";
import { DialogType, promptForOpenOutputChannel } from "../utils/uiUtils";

export async function addFavorite(node: CodeforcesNode): Promise<void> {
    try {
        await globalState.setFavorite(node.id, true);
        await codeforcesTreeDataProvider.refresh();
    } catch (error) {
        await promptForOpenOutputChannel("Failed to add the problem to favorite. Please open the output channel for details.", DialogType.error);
    }
}

export async function removeFavorite(node: CodeforcesNode): Promise<void> {
    try {
        await globalState.setFavorite(node.id, false);
        await codeforcesTreeDataProvider.refresh();
    } catch (error) {
        await promptForOpenOutputChannel("Failed to remove the problem from favorite. Please open the output channel for details.", DialogType.error);
    }
}