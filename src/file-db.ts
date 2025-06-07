import { performRegularCleanup } from "./registerProcessCleanup.ts";
import { syncFileDb } from "./commands/syncFileDb.ts";
import { parseArgs, RunMainParams } from "./args/parseArgs.ts";
import { performIgnoreAction } from "./commands/performIgnoreAction.ts";
import { showTree } from "./commands/showTree.ts";
import { mergeDatabaseFile } from "./commands/mergeDatabaseFile.ts";
import { cleanDatabase } from "./commands/cleanDatabase.ts";

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
        case 'clean': {
            const { dbPath, dryRun } = params
            await cleanDatabase({
                dbPath,
                dryRun,
            })
            return
        }
        case 'ignore action': {
            const { dbPath, action, filePath, hostname, } = params
            await performIgnoreAction({
                dbPath,
                action,
                filePath,
                hostname,
            })
            return
        }
        case 'merge': {
            const { dbPath, remoteDbPath } = params
            return await mergeDatabaseFile({
                dbPath,
                remoteDbPath,
            })
        }
        case 'show-tree': {
            const {
                dbPath,
                depth,
                hostname,
                path,
                keepAlive,
                primaryCount,
            } = params
            return await showTree({
                dbPath,
                depth,
                hostname,
                path,
                keepAlive,
                primaryCount
            })
        }
        case 'sync': {
            const { dbPath, filePath } = params
            const correctDrivePaths = filePath.match(/^[a-z]:$/i)
                ? `${filePath}/`
                : filePath
            const { numFiles, numPathErrors } = await syncFileDb({
                dbPath,
                filePath: correctDrivePaths,
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
