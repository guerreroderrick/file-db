import { DB } from "../../deps.ts";
import { addFileListing } from "../db/addFileListing.ts";
import { initTable_files_Log } from "../db/initSchema.ts";
import { updateFileHash } from "../db/updateFileHash.ts";
import { getFileHashSync } from "../getFileHash.ts";
import { listFilesSync } from "../listFiles.ts";
import { getLocalPath } from "../path/getLocalPath.ts";

export function syncFileDb(filePath: string) {
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
