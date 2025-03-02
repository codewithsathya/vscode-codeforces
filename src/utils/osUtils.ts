export function isWindows(): boolean {
    return process.platform === "win32";
}

export const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));
