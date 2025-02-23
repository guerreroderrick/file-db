import { assert } from "@std/assert/assert";
import { performRegularCleanup } from "./registerProcessCleanup.ts";
import { listFilesSync } from "./listFiles.ts";
import { addFileListing } from "./db/addFileListing.ts";
import { DB } from "../deps.ts";
import { getFileHashSync } from "./getFileHash.ts";
import { initTable_files_Log } from "./db/initSchema.ts";
import { updateFileHash } from "./db/updateFileHash.ts";

if (import.meta.main) {
    await main(Deno.args)
}

async function main(args: string[]) {
    try {
        const params = parseArgs(args)
        await runMain(params)
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

async function runMain(params: RunMainParams) {
    switch (params.paramSet) {
        case 'sync': {
            const { filePath } = params
            await syncFileDb(filePath)
            return
        }
        case 'normalize': {
            console.error(`--normalize not yet implemented`)
            return
        }
        default: assertNever(params)
    }
}

function syncFileDb(filePath: string) {
    const files = listFilesSync(filePath)
    const hostname = Deno.hostname()
    console.log({ hostname, fileCount: files.length })

    const db = new DB(getLocalPath(import.meta, '/../file-db.sqlite3'))
    initTable_files_Log(db)

    for (const file of files) {
        const { hash: existingHash } = addFileListing({
            db,
            hostname,
            file,
        })
        const [ path, size ] = file

        if (existingHash === null && size > 0) {
            const hash = getFileHashSync(path)
            console.log({ path, size, hash })
            updateFileHash({
                db,
                hostname,
                file,
                hash,
            })
        }
    }
}

function getLocalPath(importMeta: ImportMeta, path: string) {
    return (importMeta.dirname ?? '.') + path
}

function assertNever(_: never): never {
    throw new Error(`Unexpected object: ${_}`)
}
