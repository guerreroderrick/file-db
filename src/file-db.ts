import { assert } from "@std/assert/assert";
import { performRegularCleanup } from "./registerProcessCleanup.ts";
import { assertNever } from "./util/assertNever.ts";
import { syncFileDb } from "./commands/syncFileDb.ts";
import { getDefaultDatabase } from "./db/getDefaultDatabase.ts";
import { getCanonicalPath } from "./path/getCanonicalPath.ts";

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

export function parseArgs(args: string[]): RunMainParams {
    const usage = () => {
        assert(false, `Usage: file-db [options] <file-path>`)
    }
    const normalizeIndex = args.findIndex(arg => arg.toLowerCase() === '--normalize')
    if (normalizeIndex !== -1) {
        args.splice(normalizeIndex, 1)
        return { paramSet: 'normalize' }
    }
    if (args.length !== 1) {
        usage()
    }

    const [filePath] = args
    return { paramSet: 'sync', filePath, }
}
type RunMainParams = {
    paramSet: 'sync'
    filePath: string
} | {
    paramSet: 'normalize'
}

async function runParameterSet(params: RunMainParams) {
    switch (params.paramSet) {
        case 'sync': {
            const { filePath } = params
            await syncFileDb(filePath)
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
