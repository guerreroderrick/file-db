import { assertEquals } from "@std/assert/equals";
import { addFileListing, dbTestData, getFilesNeedingHash, updateFileHash } from "./addFileListing_test.ts";

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
