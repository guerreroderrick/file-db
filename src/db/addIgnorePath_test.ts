import { assertEquals } from "@std/assert/equals";
import { dbTestData } from "./__test_dbTestData.ts";
import { addFileListing } from "./addFileListing.ts";
import { FileEntryFromArray } from "./getFilesNeedingHash_test.ts";
import { FileEntry } from "../path/listFiles.ts";
import { addIgnorePath } from "./addIgnorePath.ts";

const {
    testDb,
    initAndClearFileTable,
} = dbTestData()

Deno.test(function testAddIgnorePath() {
    initAndClearFileTable(testDb)
    const { numIgnored } = addIgnorePath({
        db: testDb,
        hostname: 'test-hostname',
        filePath: 'C:\\some-path',
    })
    assertEquals(numIgnored, 0)
})

Deno.test(function testAddIgnoredPathMultiple() {
    const fileEntries: FileEntry[] = [
        FileEntryFromArray(["C:\\some-path/parent/test.txt", 123, 456]),
        FileEntryFromArray(["C:\\some-path/parent/test2.txt", 456, 789]),
    ]
    initAndClearFileTable(testDb)
    for (const file of fileEntries) {
        addFileListing({
            db: testDb,
            hostname: 'test-hostname',
            file,
        })
    }

    const { numIgnored } = addIgnorePath({
        db: testDb,
        hostname: 'test-hostname',
        filePath: 'C:\\some-path',
    })
    assertEquals(numIgnored, 2)
})
