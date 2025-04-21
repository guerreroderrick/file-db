import { assertEquals } from "@std/assert/equals";
import { dbTestData } from './__test_dbTestData.ts'
import { DB } from "../../deps.ts";
import { addFileListing } from "./addFileListing.ts";
import { FileEntryFromArray } from "./getFilesNeedingHash_test.ts";
import { DBCheckedFile } from "./dbCheckedFile.ts";
import { addPathError } from "./addPathError.ts";
import { addIgnorePath } from "./addIgnorePath.ts";

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

        const listings: [DB, number, number][] = [
            [testDb, 5, 0],
            [fromDb, 6, 1],
        ]
        for (const [db, size, version] of listings) {
            addFileListing({
                db,
                hostname: 'hostname',
                file: FileEntryFromArray(['a/b/c', size, version]),
            })
        }
    }

    const result = mergeDb({
        from: testDb2,
        to: testDb,
    })
    assertEquals(result.fileLogChanges, 1)

    const [[size]] = testDb.query<[number]>(`
select size from files_Log where isArchived = false and path = ?
`, ['a/b/c'])
    assertEquals(size, 6)
    const [[countArchived, countActive]] = testDb.query<[number, number]>(`
select (select count(*) from files_Log where isArchived = true) [archivedTally]
    , (select count(*) from files_Log where isArchived = false) [activeTally]
    `)
    assertEquals(countArchived, 1)
    assertEquals(countActive, 1)
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

type MergeDbParams = {
    from: DBCheckedFile
    to: DB
}
function mergeDb({
    from: fromDb,
    to: toDb,
}: MergeDbParams) {

    toDb.execute(`
attach database '${fromDb.filename}' as [fromDb]
    `)

    const sync = () => {
        const [[srcVersion, destVersion]] = toDb.query<[number, number]>(`
select (select id from [fromDb].[version]) [srcVersion]
    , (select id from [version]) [destVersion]
        `)
        if (srcVersion !== destVersion) {
            throw new Error(`Database versions do not match: ${srcVersion} != ${destVersion}`)
        }

        toDb.execute(`
create temp table files_Staging as
    select
        src.hostname
        , src.path
        , src.size
        , src.modifyTime
        , src.hash
        , coalesce(dest.hash, 0) + 1 [version]
        , false [isArchived]
        , iif(dest.hostname is null, 1, 0) isNew
        from [fromDb].[files_Log] src
        left join [files_Log] dest on src.hostname = dest.hostname
            and src.path = dest.path
            and src.isArchived = false
            and dest.isArchived = false
        where dest.hostname is null
            or src.modifyTime > dest.modifyTime
; create temp table pathErrors_Staging as
    select src.hostname, src.path, src.scanTime, src.error
        from [fromDb].[pathErrors_Log] src
        left join [pathErrors_Log] dest on src.hostname = dest.hostname
            and src.path = dest.path
            and src.scanTime = dest.scanTime
        where dest.hostname is null
; create temp table ignoredFiles_Staging as
    select src.hostname, src.path, src.addedAt
        from [fromDb].[ignoredFiles_Log] src
        left join [ignoredFiles_Log] dest on src.hostname = dest.hostname
            and src.path = dest.path
            and src.addedAt = dest.addedAt
        where dest.hostname is null
        `)

        toDb.execute(`
with archivedFiles as (
    select dest.rowid
        from files_Staging src
        join [files_Log] dest on src.hostname = dest.hostname
            and src.path = dest.path
            and dest.isArchived = false
)
    update files_Log set isArchived = true
        where rowid in (select rowid from archivedFiles)
; insert into files_Log (hostname, path, size, modifyTime, hash, version, isArchived)
    select hostname, path, size, modifyTime, hash, version, isArchived
        from files_Staging
        `)
        const fileLogChanges= toDb.changes

        toDb.execute(`
insert into pathErrors_Log (hostname, path, scanTime, error)
    select hostname, path, scanTime, error
        from pathErrors_Staging
        `)
        const pathErrorsChanges = toDb.changes

        toDb.execute(`
insert into ignoredFiles_Log (hostname, path, addedAt)
    select hostname, path, addedAt
        from ignoredFiles_Staging
        `)
        const ignoredFilesChanges = toDb.changes

        toDb.execute(`
drop table if exists files_Staging
; drop table if exists pathErrors_Staging
; drop table if exists ignoredFiles_Staging
        `)

        return {
            fileLogChanges,
            pathErrorsChanges,
            ignoredFilesChanges,
        }
    }

    const {
        fileLogChanges,
        pathErrorsChanges,
        ignoredFilesChanges,
    } = toDb.transaction(() => sync())
    toDb.execute(`
detach database [fromDb]
    `)

    return {
        fileLogChanges,
        pathErrorsChanges,
        ignoredFilesChanges,
    }
}
