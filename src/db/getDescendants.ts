import { DB } from "../../deps.ts";

type GetDescendantParams = {
    hostname: { isAnyHost: true } | { isAnyHost: false; host: string }
    path: { isAnyPath: true } | { isAnyPath: false; prefix: string }
    db: DB
}
export type FileEntry = {
    hostname: string
    path: string
    size: number
}
export function getDescendants({
    db,
    hostname,
    path,
}: GetDescendantParams) {

    const rows = db.query<[string, string, number]>(`
select hostname, path, size
    from [files_Log]
    where 1=1
        and isArchived = 0
        and (:paramHostname is null or hostname = :paramHostname)
        and (:paramPath is null
            or path = :paramPath
            or path like :paramPath || '/%'
            or path like :paramPath || '\\%'
            )
`, {
    paramHostname: hostname.isAnyHost ? null : hostname.host,
    paramPath: path.isAnyPath ? null : path.prefix,
})
    const descendants: FileEntry[] = rows
        .map(([hostname, path, size]) => ({
            hostname,
            path,
            size,
        }))
    return descendants
}