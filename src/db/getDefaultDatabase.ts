import { DB } from "../../deps.ts";
import { getLocalPath } from "../path/getLocalPath.ts";
import { registerProcessCleanup } from "../registerProcessCleanup.ts";
import { initTable_files_Log } from "./initSchema.ts";

export function getDefaultDatabase() {
    const dbPath = getLocalPath(import.meta, '/../../file-db.sqlite3')
    console.log(`Opening database at ${dbPath}`)
    const db = new DB(dbPath)
    initTable_files_Log(db)
    registerProcessCleanup(() => {
        db.close()
        console.log('Database closed.')
    })
    return db
}
