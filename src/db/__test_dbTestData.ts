import { DB } from "../../deps.ts";
import { initTable_files_Log } from "./initSchema.ts";

const testDb = new DB((import.meta.dirname??'.') + '/../.test.sqlite3')

export function dbTestData() {
    return {
        testDb,
        initAndClearFileTable,
    }
}
function initAndClearFileTable(db: DB) {
    initTable_files_Log(db)
    db.execute(`delete from [files_Log]`)
}
