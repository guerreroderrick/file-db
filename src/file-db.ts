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
            const { action, filePath } = params
            await performIgnoreAction(action, filePath)
            return
        }
        case 'show-tree': {
            const { depth, hostname, path, keepAlive } = params
            return await showTree({ depth, hostname, path, keepAlive })
        }
        case 'sync': {
            const { filePath } = params
            const { numFiles, numPathErrors } = await syncFileDb(filePath)
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
