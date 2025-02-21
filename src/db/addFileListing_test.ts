import { assert } from '@std/assert/assert'
import { DB } from '../../deps.ts'
import { FileEntry } from './../listFiles.ts'
import { assertEquals } from '@std/assert/equals'
import { addFileListing } from "./addFileListing.ts";

const testDb = new DB((import.meta.dirname??'.') + '/../.test.sqlite3')

Deno.test(function testAddFileListing() {
    const testFile: FileEntry = ["parent/test.txt", 123, 456]

    initAndClearFileTable(testDb)
    addFileListing({
        db: testDb,
        hostname: 'test-hostname',
        file: testFile,
    })
})

Deno.test(function testUpdateFileListing() {
    const testFile: FileEntry = ["parent/test.txt", 123, 456]
    const updatedFile: FileEntry = ["parent/test.txt", 456, 789]

    initAndClearFileTable(testDb)
    addFileListing({
        db: testDb,
        hostname: 'test-hostname',
        file: testFile,
    })
    addFileListing({
        db: testDb,
        hostname: 'test-hostname',
        file: updatedFile,
    })
})

Deno.test(function testPreviousVersionsAreArchived() {
    const testFile: FileEntry = ["parent/test.txt", 123, 456]
    const update1: FileEntry = ["parent/test.txt", 456, 789]
    const update2: FileEntry = ["parent/test.txt", 789, 790]

    initAndClearFileTable(testDb)
    addFileListing({ db: testDb, hostname: 'test-hostname', file: testFile })
    addFileListing({ db: testDb, hostname: 'test-hostname', file: update1 })
    addFileListing({ db: testDb, hostname: 'test-hostname', file: update2 })

    const rows = testDb.query<[size: number, version: number, isArchived: number]>(`
select size, version, isArchived
    from [files_Log]
        `)
    assert(rows.length === 3, `Expected 3 rows, but found ${rows.length}`)
    assertEquals(rows, [
        [123, 0, 1],
        [456, 1, 1],
        [789, 2, 0],
    ])
})

export function initTable_files_Log(db: DB) {
    db.execute(`
        create table if not exists [files_Log] (
            hostname text not null
            , path text not null
            , version bigint not null
            , isArchived bit not null default 0
            , size integer not null
            , modifyTime datetime not null
            , hash bytea null
            , primary key (hostname, path, version)
            )
        `)
}

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
