import { DB } from "../../deps.ts";
import { DBCheckedFile } from "./dbCheckedFile.ts";
import { initSchema } from "./initSchema.ts";

const testDb = new DB((import.meta.dirname??'.') + '/../.test.sqlite3')
const testDb2 = new DBCheckedFile((import.meta.dirname??'.') + '/../.test2.sqlite3')

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
; delete from [scanEntry_Log]
`)
}

export function addTestData(db: DB, version: number) {
    if (version < 1) { return }
    if (version === 1) { 
        db.execute(`
            insert into [files_Log] (hostname, path, size, modifyTime, hash, version)
                values ('testHost', 'testPath', 123, '2023-01-01 00:00:00', 'testHash', 1)
        `)
    }
    if (version === 2) {
        db.execute(`
            insert into [pathErrors_Log] (hostname, path, scanTime, error)
                values ('testHost', 'testPath', '2023-01-01 00:00:00', 'testError')
        `)
    }
}