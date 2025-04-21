import { DB } from "../../deps.ts";
import { initSchema } from "./initSchema.ts";

const testDb = new DB((import.meta.dirname??'.') + '/../.test.sqlite3')
const testDb2 = new DB((import.meta.dirname??'.') + '/../.test2.sqlite3')

export function dbTestData() {
    return {
        testDb,
        testDb2,
        initAndClearFileTable,
    }
}
function initAndClearFileTable(db: DB) {
    initSchema(db)

    db.execute(`
delete from [files_Log]
; delete from [ignoredFiles_Log]
; delete from [pathErrors_Log]
`)
}
