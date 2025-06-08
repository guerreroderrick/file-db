import { assertEquals } from "@std/assert/equals";
import { dbTestData } from './__test_dbTestData.ts'
import { DB } from "../../deps.ts";
import { addFileListing } from "./addFileListing.ts";
import { FileEntryFromArray } from "./getFilesNeedingHash_test.ts";
import { addPathError } from "./addPathError.ts";
import { addIgnorePath } from "./addIgnorePath.ts";
import { mergeDb } from "./mergeDb.ts";

const {
    testDb,
    testDb2,
    initAndClearFileTable,
} = dbTestData()

Deno.test(function testMergeDb_bothEmpty() {
    initAndClearFileTable(testDb)

    {
        using fromDbInstance = testDb2.useDb()
        const fromDb = fromDbInstance.db
        initAndClearFileTable(fromDb)
    }
    const result= mergeDb({
        from: testDb2,
        to: testDb,
    })
    assertEquals(result.fileLogChanges, 0)
})

Deno.test(function testMergeDb_newerFileIsUpdated() {
    initAndClearFileTable(testDb)
    {
        using fromDbInstance = testDb2.useDb()
        const fromDb = fromDbInstance.db
        initAndClearFileTable(fromDb)

        const listings: [DB, string, number, number][] = [
            [testDb, 'a/b/c', 5, 2],
            [fromDb, 'a/b/c', 6, 3],
            [fromDb, 'a/b/d', 7, 4],
        ]
        for (const [db, path, size, modifyTime] of listings) {
            addFileListing({
                db,
                hostname: 'hostname',
                file: FileEntryFromArray([path, size, modifyTime]),
            })
        }
    }

    const result = mergeDb({
        from: testDb2,
        to: testDb,
    })
    assertEquals(result.fileLogChanges, 2)

    const [[size]] = testDb.query<[number]>(`
select size from files_Log where isArchived = false and path = ?
`, ['a/b/c'])
    assertEquals(size, 6)
    const [[countArchived, countActive]] = testDb.query<[number, number]>(`
select (select count(*) from files_Log where isArchived = true) [archivedTally]
    , (select count(*) from files_Log where isArchived = false) [activeTally]
    `)
    assertEquals(countArchived, 1)
    assertEquals(countActive, 2)
})

Deno.test(function testMergeDb_pathErrorsAreMerged() {
    initAndClearFileTable(testDb)
    {
        using fromDbInstance = testDb2.useDb()
        const fromDb = fromDbInstance.db
        initAndClearFileTable(fromDb)

        const errors: [DB, string ][] = [
            [testDb, 'a/b/c'],
            [fromDb, 'a/b/d'],
        ]
        for (const [db, path] of errors) {
            addPathError({
                db,
                hostname: 'hostname',
                pathError: { path, error: 'error', },
            })
        }
    }
    const { pathErrorsChanges } = mergeDb({
        from: testDb2,
        to: testDb,
    })
    assertEquals(pathErrorsChanges, 1)

    const [[count]] = testDb.query<[number]>(`
select count(*) from pathErrors_Log
    `)
    assertEquals(count, 2)
})

Deno.test(function testMergeDb_ignoredFilesAreMerged() {
    initAndClearFileTable(testDb)
    {
        using fromDbInstance = testDb2.useDb()
        const fromDb = fromDbInstance.db
        initAndClearFileTable(fromDb)

        const ignores: [DB, string ][] = [
            [testDb, 'a/b/c'],
            [fromDb, 'a/b/d'],
        ]
        for (const [db, path] of ignores) {
            addIgnorePath({
                db,
                hostname: 'hostname',
                filePath: path,
                ignoreType: 'prefix',
            })
        }
    }
    const { ignoredFilesChanges } = mergeDb({
        from: testDb2,
        to: testDb,
    })
    assertEquals(ignoredFilesChanges, 1)

    const [[count]] = testDb.query<[number]>(`
select count(*) from ignoredFiles_Log
    `)
    assertEquals(count, 2)
})

Deno.test(function testMergeDb_remoteIgnoresUpdatePaths() {
    initAndClearFileTable(testDb)
    {
        using fromDbInstance = testDb2.useDb()
        const fromDb = fromDbInstance.db
        initAndClearFileTable(fromDb)

        addFileListing({
            db: testDb,
            hostname: 'hostname',
            file: FileEntryFromArray(['a/b/c', 5, 2]),
        })
        addIgnorePath({
            db: fromDb,
            hostname: 'hostname',
            filePath: 'a/b',
            ignoreType: 'prefix',
        })
    }
    const { ignoredFilesChanges, fileLogNewlyIgnored, } = mergeDb({
        from: testDb2,
        to: testDb,
    })
    const [[isArchived]] = testDb.query<[number]>(`
select isArchived from files_Log where path = ?
`, ['a/b/c'])

    assertEquals({
        isArchived,
        ignoredFilesChanges,
        fileLogNewlyIgnored,
    }, {
        isArchived: 1,
        ignoredFilesChanges: 1,
        fileLogNewlyIgnored: 1,
    })
})

Deno.test(function testMergeDb_mergeMultipleVersions() {
    initAndClearFileTable(testDb)
    {
        using fromDbInstance = testDb2.useDb()
        const fromDb = fromDbInstance.db
        initAndClearFileTable(fromDb)

        const listings: [DB, string, number, number][] = [
            [testDb, 'a/b/c', 5, 2],
            [fromDb, 'a/b/c', 6, 3],
            [fromDb, 'a/b/c', 7, 4],
            [fromDb, 'a/b/d', 8, 5],
        ]
        for (const [db, path, size, modifyTime] of listings) {
            addFileListing({
                db,
                hostname: 'hostname',
                file: FileEntryFromArray([path, size, modifyTime]),
            })
        }
    }

    const result = mergeDb({
        from: testDb2,
        to: testDb,
    })
    assertEquals(result.fileLogChanges, 2)
})