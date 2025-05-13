import * as fs from "fs/promises";
import * as path from "path";

import { globalState } from "../globalState";
import { codeforcesChannel } from "../codeforcesChannel";

export async function deleteBrowsersFolderIfExists() {
    const folderPath = path.join(
        globalState.getGlobalStoragePath(),
        "browsers",
    );

    try {
        await fs.access(folderPath);

        await fs.rm(folderPath, { recursive: true, force: true });

        codeforcesChannel.appendLine(`Delete old browsers: ${folderPath}`);
    } catch (err) {}
}
