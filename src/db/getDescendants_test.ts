import { assertEquals } from '@std/assert/equals'
import { dbTestData } from './__test_dbTestData.ts'
import { getDescendants } from './getDescendants.ts'
import { addFileListing } from "./addFileListing.ts";
import { FileEntryFromArray } from "./getFilesNeedingHash_test.ts";

const {
    testDb,
    initAndClearFileTable,
} = dbTestData()

function setupTest_2hosts2paths() {
    initAndClearFileTable(testDb)

    addFileListing({
        db: testDb,
        hostname: 'host1',
        file: FileEntryFromArray(['path1', 100, 0]),
    })
    addFileListing({
        db: testDb,
        hostname: 'host2',
        file: FileEntryFromArray(['path2', 200, 0]),
    })
}

Deno.test(function testGetDescendants_empty() {
    initAndClearFileTable(testDb)

    const descendants = getDescendants({
        db: testDb,
        depth: 0,
        hostname: { isAnyHost: true },
        path: { isAnyPath: true },
    })
    assertEquals(descendants, [])
})

Deno.test(function testGetDescendants_anyGivesAll() {
    setupTest_2hosts2paths()

    const descendants = getDescendants({
        db: testDb,
        depth: 0,
        hostname: { isAnyHost: true },
        path: { isAnyPath: true },
    })
    assertEquals(descendants, [
        { hostname: 'host1', path: 'path1', size: 100 },
        { hostname: 'host2', path: 'path2', size: 200 },
    ])
})

Deno.test(function testGetDescendants_host1() {
    setupTest_2hosts2paths()

    const descendants = getDescendants({
        db: testDb,
        depth: 0,
        hostname: { isAnyHost: false, host: 'host1' },
        path: { isAnyPath: true },
    })
    assertEquals(descendants, [
        { hostname: 'host1', path: 'path1', size: 100 },
    ])
})

Deno.test(function testGetDescendants_path2() {
    setupTest_2hosts2paths()

    const descendants = getDescendants({
        db: testDb,
        depth: 0,
        hostname: { isAnyHost: true },
        path: { isAnyPath: false, prefix: 'path2' },
    })
    assertEquals(descendants, [
        { hostname: 'host2', path: 'path2', size: 200 },
    ])
})

Deno.test(function testGetDescendants_path1Prefix() {
    initAndClearFileTable(testDb)
    ; [
        'path1',
        'path1/child1',
        'path1\\child2',
        'path1nonchild',
    ]
        .map(path => {
            addFileListing({
                db: testDb,
                hostname: 'host1',
                file: FileEntryFromArray([path, 100, 0]),
            })
        })

    const descendants = getDescendants({
        db: testDb,
        depth: 0,
        hostname: { isAnyHost: true },
        path: { isAnyPath: false, prefix: 'path1' },
    })
    assertEquals(descendants, [
        { hostname: 'host1', path: 'path1', size: 100 },
        { hostname: 'host1', path: 'path1/child1', size: 100 },
        { hostname: 'host1', path: 'path1\\child2', size: 100 },
    ])
})

Deno.test(function testGetDescendants_pathWithAnyHost() {
    initAndClearFileTable(testDb)
    ; [
        ['host1', 'path1/child1'],
        ['host2', 'path1/child2'],
        ['host2', 'path2/child3'],
    ]
        .map(([host, path]) => {
            addFileListing({
                db: testDb,
                hostname: host,
                file: FileEntryFromArray([path, 100, 0]),
            })
        })
    const descendants = getDescendants({
        db: testDb,
        depth: 0,
        hostname: { isAnyHost: true },
        path: { isAnyPath: false, prefix: 'path1' },
    })
    assertEquals(descendants, [
        { hostname: 'host1', path: 'path1/child1', size: 100 },
        { hostname: 'host2', path: 'path1/child2', size: 100 },
    ])
})
