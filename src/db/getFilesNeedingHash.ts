import { DB } from "../../deps.ts";

export type GetFilesNeedingHashParams = {
    db: DB
    hostname: string
}
export function getFilesNeedingHash({
    db,
    hostname,
}: GetFilesNeedingHashParams) {
    return db.query<[path: string, size: number, modifyTime: number]>(`
select path, size, modifyTime
    from [files_Log]
    where isArchived = 0
        and hostname = ?
        and hash is null
        `, [hostname])
}
