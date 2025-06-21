import { assertEquals } from "@std/assert/equals";
import { DB } from '../../deps.ts'
import { dbTestData } from "./__test_dbTestData.ts";
import { addIgnorePath, IgnoreType } from "./addIgnorePath.ts";

export type GetIgnoresParams = {
    hostname: string
    db: DB
}
export function getIgnores({
    hostname: _h,
    db: _db,
}: GetIgnoresParams) {
    const nameFilters: string[] = []

    const rows = _db.queryEntries<{ path: string, ignoreType: string, }>(`
select path, ignoreType
    from [ignoredFiles_Log]
`)
    console.log({ debug: 'getIgnores', rows, })

    const prefixFilters = rows
        .filter(row => row.ignoreType === 'prefix')
        .map(row => row.path)

    return {
        prefixFilters,
        nameFilters,
    }
}

const {
    testDb,
    initAndClearFileTable,
} = dbTestData()

Deno.test(function getIgnores_whenEmpty_returnsEmpty() {
    initAndClearFileTable(testDb)
    const ignores = getIgnores({
        hostname: 'test-host',
        db: testDb,
    })
    assertEquals(ignores, {
        prefixFilters: [],
        nameFilters: []
    })
})

Deno.test(function getIgnores_returnsPrefixIgnores() {
    const ignorePaths = [
        'ignored/path',
        'another/ignored/path',
    ]

    initAndClearFileTable(testDb)
    const testDbData = {
        hostname: 'test-host',
        db: testDb,
        ignoreType: 'prefix' as IgnoreType,
    }
    for (const prefix of ignorePaths) {
        addIgnorePath({
            ...testDbData,
            filePath: prefix,
        })
    }
    
    const ignores = getIgnores({
        hostname: 'test-host',
        db: testDb,
    })
    assertEquals(ignores, {
        prefixFilters: ignorePaths,
        nameFilters: []
    })
})