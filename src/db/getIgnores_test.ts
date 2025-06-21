import { assertEquals } from "@std/assert/equals";
import { DB } from '../../deps.ts'
import { dbTestData } from "./__test_dbTestData.ts";
import { addIgnorePath, IgnoreType } from "./addIgnorePath.ts";

export type GetIgnoresParams = {
    hostname: string
    db: DB
}
export function getIgnores({
    hostname,
    db,
}: GetIgnoresParams) {
    const rows = db.queryEntries<{ path: string, ignoreType: string, }>(`
select path, ignoreType
    from [ignoredFiles_Log]
    where hostname = ?
`, [hostname])
    const prefixFilters = rows
        .filter(row => row.ignoreType === 'prefix')
        .map(row => row.path)
    const nameFilters = rows
        .filter(row => row.ignoreType === 'name')
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

Deno.test(function getIgnores_returnsNameIgnores() {
    const ignorePaths = [
        'ignoredpath',
        'anotherignoredpath',
    ]

    initAndClearFileTable(testDb)
    const testDbData = {
        hostname: 'test-host',
        db: testDb,
        ignoreType: 'name' as IgnoreType,
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
        prefixFilters: [],
        nameFilters: ignorePaths,
    })
})