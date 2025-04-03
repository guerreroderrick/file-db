import { assertEquals } from 'jsr:@std/assert/equals'
import { dbTestData } from "./__test_dbTestData.ts"
import { PathError } from "../path/listFiles.ts";
import { addPathError } from "./addPathError.ts";

const {
    testDb,
    initAndClearFileTable,
} = dbTestData()

Deno.test(function testAddPathError() {
    const pathError: PathError = {
        path: 'some/path',
        error: new Error('Some error message')
    }

    initAndClearFileTable(testDb)
    addPathError({
        db: testDb,
        hostname: 'test-hostname',
        pathError,
    })

    const rows = testDb.query<[number]>(`
select count(*) from [pathErrors_log]
    `)
    assertEquals(rows, [[1]])
})
