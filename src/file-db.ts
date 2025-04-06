import { performRegularCleanup } from "./registerProcessCleanup.ts";
import { assertNever } from "./util/assertNever.ts";
import { syncFileDb } from "./commands/syncFileDb.ts";
import { getDefaultDatabase } from "./db/getDefaultDatabase.ts";
import { getCanonicalPath } from "./path/getCanonicalPath.ts";
import { parseArgs, RunMainParams } from "./args/parseArgs.ts";

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
        case 'normalize': {
            await normalizePaths();
            return
        }
        default: assertNever(params)
    }
}

async function normalizePaths() {
    const db = getDefaultDatabase()
    try {
        db.createFunction((path: string) => {
            const canonicalPath = getCanonicalPath(path)
            if (path !== canonicalPath) {
                console.log(`Normalizing path: ${path} -> ${canonicalPath}`)
            }
            return canonicalPath
        }, { name: 'normalizePath' })

        db.query(`
update [files_Log] set [path] = normalizePath([path])
            `)
        const updateCount = db.changes
        console.log({ updateCount })
    } finally {
        db.deleteFunction('normalizePath')
    }
    await Promise.resolve()
}
