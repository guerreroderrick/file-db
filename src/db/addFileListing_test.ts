import { assert } from 'jsr:@std/assert/assert'
import { FileEntry } from './../listFiles.ts'
import { assertEquals } from 'jsr:@std/assert/equals'
import { addFileListing } from "./addFileListing.ts"
import { updateFileHash } from "./updateFileHash.ts"
import { dbTestData } from "./__test_dbTestData.ts"

const {
    testDb,
    initAndClearFileTable,
} = dbTestData()

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

Deno.test(function testUpdateFileListingSameIgnored() {
    const testFile: FileEntry = ["parent/test.txt", 123, 456]

    initAndClearFileTable(testDb)
    updateFileHash({
        db: testDb,
        hostname: 'test-hostname',
        file: testFile,
        hash: 'some-hash',
    })
    addFileListing({
        db: testDb,
        hostname: 'test-hostname',
        file: testFile,
    })
    const versions = testDb.query<[version: number, hash: string]>(`
select version, hash
    from [files_Log]
        `)
    assertEquals(versions, [[0, 'some-hash']])
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
