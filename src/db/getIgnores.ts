import { DB } from '../../deps.ts'

export type GetIgnoresParams = {
    hostname: string
    db: DB
}
export function getIgnores({
    hostname,
    db,
}: GetIgnoresParams) {
    const rows = db.queryEntries<{ path: string, ignoreType: string, }>(`
select path, ignoreType
    from [ignoredFiles_Log]
    where hostname = ?
`, [hostname])
    const prefixFilters = rows
        .filter(row => row.ignoreType === 'prefix')
        .map(row => row.path)
    const nameFilters = rows
        .filter(row => row.ignoreType === 'name')
        .map(row => row.path)

    return {
        prefixFilters,
        nameFilters,
    }
}
