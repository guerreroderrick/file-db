import { performRegularCleanup } from "./registerProcessCleanup.ts";
import { syncFileDb } from "./commands/syncFileDb.ts";
import { parseArgs, RunMainParams } from "./args/parseArgs.ts";
import { performIgnoreAction } from "./commands/performIgnoreAction.ts";
import { showTree } from "./commands/showTree.ts";

if (import.meta.main) {
    await main(Deno.args)
}

async function main(args: string[]) {
    try {
        const params = parseArgs(args)
        await runParameterSet(params)
    } finally {
        performRegularCleanup()
    }
}

async function runParameterSet(params: RunMainParams) {
    switch (params.paramSet) {
        case 'error': {
            const { error } = params
            console.error({ error })
        }   // fallthrough
        case 'help': {
            const { helpText } = params
            console.log(helpText)
            return
        }
        case 'ignore action': {
            const { dbPath, action, filePath } = params
            await performIgnoreAction({
                dbPath,
                action,
                filePath,
            })
            return
        }
        case 'merge': {
            const { dbPath, remoteDbPath } = params
            console.log({
                debug: 'Merge command set.',
                dbPath,
                remoteDbPath,
            })
            return
        }
        case 'show-tree': {
            const { dbPath, depth, hostname, path, keepAlive } = params
            return await showTree({ dbPath, depth, hostname, path, keepAlive })
        }
        case 'sync': {
            const { dbPath, filePath } = params
            const { numFiles, numPathErrors } = await syncFileDb({
                dbPath,
                filePath,
            })
            console.log({
                debug: 'Sync complete',
                numFiles,
                numPathErrors,
            })
            return
        }
        default: { const _: never = params }
    }
}
