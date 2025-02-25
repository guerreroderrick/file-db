import { DB } from '../../deps.ts'
import { registerProcessCleanup } from '../registerProcessCleanup.ts'
import { initTable_files_Log } from './initSchema.ts'
import * as path from 'jsr:@std/path'

export function getDefaultDatabase() {
    const dbPath = path.join(Deno.cwd(), 'file-db.sqlite3')
    console.log({
        debug: `Opening database`,
        dbPath,
    })
    const db = new DB(dbPath)
    initTable_files_Log(db)
    registerProcessCleanup(() => {
        db.close()
        console.log({
            debug: 'Database closed',
            dbPath,
        })
    })
    return db
}
