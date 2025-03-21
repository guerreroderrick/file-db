import { assertThrows } from '@std/assert/throws'
import { assertEquals } from "@std/assert/equals";
import { updateFileHash } from "./updateFileHash.ts";
import { dbTestData } from "./__test_dbTestData.ts";
import { FileEntryFromArray } from "./getFilesNeedingHash_test.ts";

const {
    testDb,
    initAndClearFileTable,
} = dbTestData()

Deno.test(function testUpdateConflictingHashThrows() {
    const hash = 'B14D7728A0F027B92BED01C1B9B494DE71BDB4565A16D8AC013C027090162CA5'

    initAndClearFileTable(testDb)
    testDb.execute(`
insert into [files_Log] (hostname, path, version, size, modifyTime, hash)
    values (
        'test-hostname'
        , 'parent/test.txt', 0, 123, 456
        , 'other-hash'
        )
        `)

    const action = () => updateFileHash({
        db: testDb,
        hostname: 'test-hostname',
        file: FileEntryFromArray(["parent/test.txt", 123, 456]),
        hash,
    })
    assertThrows(action, Error, 'Conflicting information')
})

Deno.test(function testUpdateHashDifferentAttributesAdds() {
    const hash = 'B14D7728A0F027B92BED01C1B9B494DE71BDB4565A16D8AC013C027090162CA5'

    initAndClearFileTable(testDb)
    testDb.execute(`
insert into [files_Log] (hostname, path, version, size, modifyTime, hash)
    values (
        'test-hostname'
        , 'parent/test.txt', 0, 123, 456
        , 'other-hash'
        )
        `)

    updateFileHash({
        db: testDb,
        hostname: 'test-hostname',
        file: FileEntryFromArray(["parent/test.txt", 123, 457]),
        hash,
    })

    const rows = testDb.query<[modifyAt: number, hash: string | null]>(`
select modifyTime, hash
    from [files_Log]
    where hostname = 'test-hostname'
        and path = 'parent/test.txt'
    order by version
        `)
    assertEquals(rows, [[456, 'other-hash'], [457, hash]])
})

Deno.test(function testUpdateHashSameHashIgnored() {
    const hash = 'B14D7728A0F027B92BED01C1B9B494DE71BDB4565A16D8AC013C027090162CA5'

    initAndClearFileTable(testDb)
    testDb.execute(`
insert into [files_Log] (hostname, path, version, size, modifyTime, hash)
    values ('test-hostname'
        , 'parent/test.txt', 0, 123, 456
        , '${hash}'
        )
        `)

    updateFileHash({
        db: testDb,
        hostname: 'test-hostname',
        file: FileEntryFromArray(["parent/test.txt", 123, 457]),
        hash,
    })
    const rows = testDb.query<[modifyAt: number, hash: string | null]>(`
select modifyTime, hash
    from [files_Log]
    where hostname = 'test-hostname'
        and path = 'parent/test.txt'
    order by version
        `)
    assertEquals(rows, [[456, hash]])
})

Deno.test(function testUpdateHashAddsHash() {
    const hash = 'B14D7728A0F027B92BED01C1B9B494DE71BDB4565A16D8AC013C027090162CA5'

    initAndClearFileTable(testDb)
    updateFileHash({
        db: testDb,
        hostname: 'test-hostname',
        file: FileEntryFromArray(["parent/test.txt", 123, 456]),
        hash,
    })
    const rows = testDb.query<[hash: string]>(`
select hash
    from [files_Log]
        `)
    assertEquals(rows, [[hash]])
})
