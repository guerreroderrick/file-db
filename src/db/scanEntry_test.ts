import { assertGreater } from "@std/assert/greater";
import { dbTestData } from "./__test_dbTestData.ts";
import { addScanEntry, updateScanEntryEndTime, updateScanEntryHashEndTime } from "./scanEntry.ts";
import { assertEquals } from "@std/assert/equals";
import { assert } from "@std/assert/assert";
import { assertGreaterOrEqual } from "@std/assert/greater-or-equal";
import { assertThrows } from "@std/assert/throws";

const {
    testDb,
    initAndClearFileTable,
} = dbTestData()

Deno.test(function addScanEntry_shouldAdd() {
    initAndClearFileTable(testDb)
    const scanId = addScanEntry({
        db: testDb,
        hostname: 'test-host',
        path: 'test/path',
    })

    const [[num, scanEndTime, hashEndTime]] = testDb.query<[
        number,
        string | null,
        string | null,
    ]>(`
select count(*) over ()
    , scanEndTime
    , hashEndTime
    from [scanEntry_Log]`)
    assertGreater(scanId, 0)
    assertEquals(num, 1)
    assertEquals(scanEndTime, null)
    assertEquals(hashEndTime, null)
})

Deno.test(function updateScanEntryEndTime_shouldUpdateScanEndTime() {
    initAndClearFileTable(testDb)
    const scanId = addScanEntry({
        db: testDb,
        hostname: 'test-host',
        path: 'test/path',
    })

    const end = new Date()
    updateScanEntryEndTime({
        db: testDb,
        hostname: 'test-host',
        path: 'test/path',
        scanId,
    })
    const [[num, scanEndTime, hashEndTime]] = testDb.query<[
        number,
        string | null,
        string | null,
    ]>(`
select count(*) over ()
    , scanEndTime
    , hashEndTime
    from [scanEntry_Log]
`)

    assertEquals(num, 1)
    assert(scanEndTime !== null)
    assertGreaterOrEqual(scanEndTime, end.toISOString())
    assertEquals(hashEndTime, null)
})

Deno.test(function updateScanEntryEndTime_shouldFailIfAlreadySet() {
    initAndClearFileTable(testDb)
    const scanId = addScanEntry({
        db: testDb,
        hostname: 'test-host',
        path: 'test/path',
    })
    updateScanEntryEndTime({
        db: testDb,
        hostname: 'test-host',
        path: 'test/path',
        scanId,
    })

    assertThrows(() => {
        updateScanEntryEndTime({
            db: testDb,
            hostname: 'test-host',
            path: 'test/path',
            scanId,
        })
    })
})

Deno.test(function updateScanEntryHashTime_shouldUpdateHashEndTime() {
    initAndClearFileTable(testDb)
    const scanId = addScanEntry({
        db: testDb,
        hostname: 'test-host',
        path: 'test/path',
    })

    const end = new Date()
    updateScanEntryHashEndTime({
        db: testDb,
        hostname: 'test-host',
        path: 'test/path',
        scanId,
    })
    const [[num, scanEndTime, hashEndTime]] = testDb.query<[
        number,
        string | null,
        string | null,
    ]>(`
select count(*) over ()
    , scanEndTime
    , hashEndTime
    from [scanEntry_Log]
`)
    assertEquals(num, 1)
    assertEquals(scanEndTime, null)
    assertGreaterOrEqual(hashEndTime, end.toISOString())
})

Deno.test(function updateScanEntryHashTime_shouldFailIfAlreadySet() {
    initAndClearFileTable(testDb)
    const scanId = addScanEntry({
        db: testDb,
        hostname: 'test-host',
        path: 'test/path',
    })

    updateScanEntryHashEndTime({
        db: testDb,
        hostname: 'test-host',
        path: 'test/path',
        scanId,
    })
    assertThrows(() => {
        updateScanEntryHashEndTime({
            db: testDb,
            hostname: 'test-host',
            path: 'test/path',
            scanId,
        })
    })
})
