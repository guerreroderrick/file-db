import { assert } from "@std/assert/assert";
import { FileEntry } from "../listFiles.ts";
import { DB } from "../../deps.ts";

export type UpdateFileHashParams = {
    db: DB
    hostname: string
    file: FileEntry
    hash: string
}
export function updateFileHash({
    db,
    hostname,
    file: [path, size, modifyTime],
    hash,
}: UpdateFileHashParams) { db.transaction(() => {
    const existingAttr = db
        .query<[version: number, size: number, modifyTime: number, hash: string]>(`
select version, size, modifyTime, hash
    from [files_Log]
    where isArchived = 0
        and hostname = ?
        and path = ?
        `, [hostname, path])

    assert(existingAttr.length <= 1, `Expected at most one file entry for ${hostname}:${path}, but found ${existingAttr.length} rows`)
    let version: number | undefined
    if (existingAttr.length === 1) {
        const [[existingVersion, existingSize, existingModifyTime, existingHash]] = existingAttr
        if (hash === existingHash) { return }

        version = existingVersion
        if (existingSize === size
            && existingModifyTime === modifyTime
            && existingHash === null
        ) {
            db.query(`
update [files_Log] set hash = ?
    where hostname = ?
        and path = ?
        and version = ?
                `, [hash, hostname, path, existingVersion])
            return
        }

        if (existingSize === size
            && existingModifyTime === modifyTime
            && existingHash !== null
        ) {
            const comparison = {
                sizes: [existingSize, size],
                modifyTimes: [existingModifyTime, modifyTime],
                hashes: [existingHash, hash],
            }
            throw new Error(`Conflicting information for ${hostname}:${path}
    ${JSON.stringify(comparison, null, 2)}
        `)
        }
    }

    const nextVersion = version === undefined ? 0 : version + 1
    db.query(`
insert into [files_Log] (hostname, path, version, size, modifyTime, hash)
    values (?, ?, ?, ?, ?, ?)
        `, [hostname, path, nextVersion, size, modifyTime, hash])

})}
