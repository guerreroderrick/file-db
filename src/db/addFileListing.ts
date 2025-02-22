import { assert } from 'jsr:@std/assert/assert'
import { DB } from '../../deps.ts'
import { FileEntry } from '../listFiles.ts'

export type addFileListingParams = {
    db: DB
    hostname: string
    file: FileEntry
}
export function addFileListing({
    db,
    hostname,
    file: [path, size, modifyTime],
}: addFileListingParams) {
    const existingAttr = db.query<[version: number, size: number, modifyTime: number]>(`
select version, size, modifyTime
    from (select *, row_number() over (order by version desc) [RowNum]
        from [files_Log]
        where hostname = ?
            and path = ?
        ) f
    where f.RowNum = 1
        `, [hostname, path])
    assert(existingAttr.length <= 1, `Expected at most one file entry for ${hostname}:${path}, but found ${existingAttr.length} rows`)

    if (existingAttr.length === 0) {
        db.query(`
insert into [files_Log] (hostname, path, version, size, modifyTime)
    values (?, ?, 0, ?, ?)
            `, [hostname, path, size, modifyTime])
        return
    }
    const [[version, existingSize, existingModifyTime]] = existingAttr
    if (existingSize === size && existingModifyTime === modifyTime) {
        return
    }

    db.transaction(() => {
        db.query(`
update [files_Log] set isArchived = true
    where hostname = ?
        and path = ?
        and version = ?
        and isArchived = false
            `, [hostname, path, version])
        db.query(`
insert into [files_Log] (hostname, path, version, size, modifyTime)
    values (?, ?, ?, ?, ?)
            `, [hostname, path, version + 1, size, modifyTime])
    })
}
