import { DB } from "../../deps.ts";

type AddIgnorePathParams = {
    db: DB
    hostname: string
    filePath: string
}
export function addIgnorePath({ db, hostname, filePath, }: AddIgnorePathParams) { return db.transaction(() => {

    db.query(`
insert into [ignoredFiles_Log] (hostname, path, addedAt)
    values (?, ?, ?)
`   , [ hostname, filePath, new Date()])

    const [[ ignoreId ]] = db.query<[number]>(`select last_insert_rowid()`)

    db.query(`
update [files_Log] set ignoredFileId = ?
    where ignoredFileId is null
        and hostname = ?
        and path like ? || '%'
`   , [ignoreId, hostname, filePath])

    const [[ numIgnored ]] = db.query<[number]>(`select changes()`)

    return { numIgnored, }
})}
