import { assert } from "@std/assert/assert";
import { DB } from "../../deps.ts";
import { tryCatch } from "../util/tryCatch.ts";

type AddIgnorePathParams = {
    db: DB
    hostname: string
    filePath: string
}
export async function addIgnorePath({ db, hostname, filePath, }: AddIgnorePathParams) { return await db.transaction(async () => {

    const tryAdd = await tryCatch(() => {
        db.query(`
    insert into [ignoredFiles_Log] (hostname, path, addedAt)
        values (?, ?, ?)
    `   , [ hostname, filePath, new Date()])

        const [[ ignoreId ]] = db.query<[number]>(`select last_insert_rowid()`)
        return ignoreId
    })

    let ignoreId: number | undefined
    let readd = false
    if (tryAdd.error) {
        const rowIds = db.query<[number]>(`
select rowid from [ignoredFiles_Log] where hostname = ? and path = ?
`           , [ hostname, filePath ]
        )
        assert(rowIds.length === 1, `Expected exactly one row for hostname ${hostname} and path ${filePath}, but found ${rowIds.length}`)
        const [[ rowId ]] = rowIds
        ignoreId = rowId
        readd = true
    } else {
        ignoreId = tryAdd.value
    }

    if (readd) {
        db.query(`
update [files_Log] set isArchived = 1
    where ignoredFileId is ?
        and hostname = ?
        and path like ? || '%'
`           , [ignoreId, hostname, filePath]
        )
    } else {
        db.query(`
update [files_Log] set ignoredFileId = ?
    , isArchived = 1
    where ignoredFileId is null
        and hostname = ?
        and path like ? || '%'
`           , [ignoreId, hostname, filePath]
        )
    }

    const [[ numIgnored ]] = db.query<[number]>(`select changes()`)
    console.log({
        debug: `Add ignore path`,
        hostname,
        filePath,
        numIgnored,
        readd,
    })
    return { numIgnored, }
})}
