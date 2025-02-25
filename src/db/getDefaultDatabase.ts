import { DB } from '../../deps.ts'
import { registerProcessCleanup } from '../registerProcessCleanup.ts'
import { once } from "../util/once.ts";
import { initSchema } from './initSchema.ts'
import * as path from 'jsr:@std/path'

export function getDefaultDatabase() {
    return lazy_getDefaultDatabase()
}

const lazy_getDefaultDatabase = once(_getDefaultDatabase)
function _getDefaultDatabase() {
    const dbPath = path.join(Deno.cwd(), 'file-db.sqlite3')
    console.log({
        debug: `Opening database`,
        dbPath,
    })
    const db = new DB(dbPath)
    initSchema(db)
    registerProcessCleanup(() => {
        db.close()
        console.log({
            debug: 'Database closed',
            dbPath,
        })
    })
    return db
}
