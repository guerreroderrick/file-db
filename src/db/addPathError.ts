import { DB } from '../../deps.ts'
import { PathError } from '../path/listFiles.ts'

export type addPathErrorParams = {
    db: DB
    hostname: string
    scanId: number
    pathError: PathError
}
export function addPathError({
    db,
    hostname,
    scanId,
    pathError,
}: addPathErrorParams) { return db.transaction(() => {

    const { path, error } = pathError
    const errString = `${error}`
    db.query(`
insert into [pathErrors_log] (hostname, path, scanId, scanTime, error)
    values (?, ?, ?, ?, ?)
        `, [hostname, path, scanId ?? -1, Date.now(), errString])
})}
