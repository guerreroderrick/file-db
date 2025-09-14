import { assertEquals } from "@std/assert/equals";
import { dbTestData } from "./__test_dbTestData.ts";
import { addIgnorePath, IgnoreType } from "./addIgnorePath.ts";
import { getIgnores } from "./getIgnores.ts";

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