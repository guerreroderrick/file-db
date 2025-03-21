import { DB } from "../../deps.ts";
import { initSchema } from "./initSchema.ts";

const testDb = new DB((import.meta.dirname??'.') + '/../.test.sqlite3')

export function dbTestData() {
    return {
        testDb,
        initAndClearFileTable,
    }
}
function initAndClearFileTable(db: DB) {
    initSchema(db)
    db.execute(`delete from [files_Log]`)
    db.execute(`delete from [pathErrors_Log]`)
}
