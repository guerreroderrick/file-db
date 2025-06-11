import { assert } from "@std/assert/assert";
import { DB } from "../../deps.ts";
import { tryCatchSync } from "../util/tryCatch.ts";

export type IgnoreType = 'prefix'
type AddIgnorePathParams = {
    db: DB
    hostname: string
    filePath: string
    ignoreType: IgnoreType
}
export function addIgnorePath({
    db,
    hostname,
    filePath,
    ignoreType,
}: AddIgnorePathParams) { return db.transaction(() => {

    const tryAdd = tryCatchSync(() => {
        db.query(`
    insert into [ignoredFiles_Log] (ignoreType, hostname, path, addedAt)
        values (?, ?, ?, ?)
    `   , [ ignoreType, hostname, filePath, new Date()])

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
        assert(rowIds.length === 1, `Expected exactly one row for hostname ${hostname} and path ${filePath}, but found ${rowIds.length}. Error was ${tryAdd.error.message}`)
        const [[ rowId ]] = rowIds
        ignoreId = rowId
        readd = true
    } else {
        ignoreId = tryAdd.value
    }

    if (ignoreType === 'prefix') {
        if (readd) {
            db.query(`
    update [files_Log] set isArchived = 1
        , ignoredFileId = ?
        where 1=1
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
