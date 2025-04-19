import { DB } from '../../deps.ts'
import { registerProcessCleanup } from '../registerProcessCleanup.ts'
import { memo } from "../util/once.ts";
import { initSchema } from './initSchema.ts'
import * as path from 'jsr:@std/path'

export function getDefaultDatabase(dbPath?: string) {
    return lazy_getDefaultDatabase(dbPath)
}

const lazy_getDefaultDatabase = memo(_getDefaultDatabase)
function _getDefaultDatabase(dbPathArg?: string) {
    const dbPath = dbPathArg ?? path.join(Deno.cwd(), 'file-db.sqlite3')
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
