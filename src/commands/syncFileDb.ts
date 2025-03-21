import { addFileListing } from "../db/addFileListing.ts";
import { addPathError } from "../db/addPathError.ts";
import { getDefaultDatabase } from "../db/getDefaultDatabase.ts";
import { updateFileHash } from "../db/updateFileHash.ts";
import { getFileHash } from "../getFileHash.ts";
import { isFileEntry, isPathError, listFilesSync } from "../listFiles.ts";

export async function syncFileDb(filePath: string) {
    const files = listFilesSync(filePath)
    const hostname = Deno.hostname()
    console.log({ hostname, fileCount: files.length })

    const db = getDefaultDatabase();

    const errors = files
        .filter(isPathError)
    for (const pathError of errors) {
        const { path, error } = pathError
        console.error(`Error listing path: ${path}: ${error}`)
        addPathError({
            db,
            hostname,
            pathError,
        })
    }

    const accessibleFiles = files
        .filter(isFileEntry)
    for (const file of accessibleFiles) {
        const { hash: existingHash } = addFileListing({
            db,
            hostname,
            file,
        })
        const { path, size, } = file

        if (existingHash === null && size > 0) {
            const hash = await getFileHash(path)
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
