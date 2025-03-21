import { DB } from '../../deps.ts'
import { PathError } from '../listFiles.ts'

export type addPathErrorParams = {
    db: DB
    hostname: string
    pathError: PathError
}
export function addPathError({
    db,
    hostname,
    pathError,
}: addPathErrorParams) { return db.transaction(() => {

    const { path, error } = pathError
    const errString = `${error}`
    db.query(`
insert into [pathErrors_log] (hostname, path, scanTime, error)
    values (?, ?, ?, ?)
        `, [hostname, path, Date.now(), errString])
})}
