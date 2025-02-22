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
        await syncFileDb(args)
    } finally {
        performRegularCleanup()
    }
}

function syncFileDb(args: string[]) {
    if (args.length !== 1) {
        assert(false, `Usage: file-db <file-path>`)
    }

    const [filePath] = args

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
        const [ path ] = file

        if (existingHash === null) {
            const hash = getFileHashSync(path)
            console.log({ path, hash })
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
