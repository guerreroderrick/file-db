import { assert } from '@std/assert/assert'
import { assertEquals } from '@std/assert/equals'
import { addFileListing } from "./addFileListing.ts"
import { updateFileHash } from "./updateFileHash.ts"
import { dbTestData } from "./__test_dbTestData.ts"
import { FileEntryFromArray } from "./getFilesNeedingHash_test.ts";
import { assertGreater } from "@std/assert/greater";

const {
    testDb,
    initAndClearFileTable,
} = dbTestData()

Deno.test(function testAddFileListing() {
    const testFile = FileEntryFromArray(["parent/test.txt", 123, 456])

    initAndClearFileTable(testDb)
    const { hash } = addFileListing({
        db: testDb,
        hostname: 'test-hostname',
        file: testFile,
    })
    assertEquals(hash, null)
})

Deno.test(function testUpdateFileListing() {
    const testFile =    FileEntryFromArray(["parent/test.txt", 123, 456])
    const updatedFile = FileEntryFromArray(["parent/test.txt", 456, 789])

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
    const [[version, hashTime]] = testDb.query<[number, number]>(`
select version, hashTime
    from [files_Log]
    where isArchived = 0
`)
    assertEquals(version, 1)
    assertGreater(hashTime, 0)
})

Deno.test(function testUpdateFileListingSameIgnored() {
    const testFile = FileEntryFromArray(["parent/test.txt", 123, 456])

    initAndClearFileTable(testDb)
    updateFileHash({
        db: testDb,
        hostname: 'test-hostname',
        file: testFile,
        hash: 'some-hash',
    })
    const { hash } = addFileListing({
        db: testDb,
        hostname: 'test-hostname',
        file: testFile,
    })
    const versions = testDb.query<[version: number, hash: string]>(`
select version, hash
    from [files_Log]
        `)
    assertEquals(versions, [[0, 'some-hash']])
    assertEquals(hash, 'some-hash') 
})

Deno.test(function testPreviousVersionsAreArchived() {
    const testFile = FileEntryFromArray(["parent/test.txt", 123, 456])
    const update1 =  FileEntryFromArray(["parent/test.txt", 456, 789])
    const update2 =  FileEntryFromArray(["parent/test.txt", 789, 790])

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
