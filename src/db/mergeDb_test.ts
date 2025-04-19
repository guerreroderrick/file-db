import { assertEquals } from "@std/assert/equals";
import { dbTestData } from './__test_dbTestData.ts'
import { DB } from "../../deps.ts";

const {
    testDb,
    testDb2,
    initAndClearFileTable,
} = dbTestData()

Deno.test(function testMergeDb_bothEmpty() {
    initAndClearFileTable(testDb)
    initAndClearFileTable(testDb2)

    const result= mergeDb({
        from: testDb2,
        to: testDb,
    })
    assertEquals(result.numChangesSynched, 0)
})

type MergeDbParams = {
    from: DB
    to: DB
}
function mergeDb({}: MergeDbParams) {
    return {
        numChangesSynched: 0,
    }
}
