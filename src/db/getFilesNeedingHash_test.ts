import { assertEquals } from '@std/assert/equals'
import { updateFileHash } from './updateFileHash.ts'
import { getFilesNeedingHash } from './getFilesNeedingHash.ts'
import { addFileListing } from "./addFileListing.ts";
import { dbTestData } from "./__test_dbTestData.ts";

const { 
    testDb,
    initAndClearFileTable,
} = dbTestData()

Deno.test(function testGetFilesNeedingHash() {
    initAndClearFileTable(testDb)

    updateFileHash({
        db: testDb,
        hostname: 'test-hostname',
        file: ["parent/test.txt", 123, 456],
        hash: 'hash1',
    })
    addFileListing({
        db: testDb,
        hostname: 'test-hostname',
        file: ["parent/test2.txt", 123, 456],
    })
    addFileListing({
        db: testDb,
        hostname: 'test-hostname2',
        file: ["parent/test3.txt", 123, 456],
    })

    const filesNeedingHash = getFilesNeedingHash({
        db: testDb,
        hostname: 'test-hostname',
    })
    assertEquals(filesNeedingHash, [["parent/test2.txt", 123, 456]])
})
