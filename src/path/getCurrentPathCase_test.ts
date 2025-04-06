import { assertEquals } from "@std/assert/equals";
import { getCurrentPathCase } from "./getCurrentPathCase.ts";

Deno.test(async function testCurrentPathCase() {
    const cases: [test: string, expected: string][] = [
        ['lower-CASE-path', 'lower-case-path'],
        ['upper-CASE-path', 'UPPER-CASE-PATH'],
        ['mixed-CASE-path', 'Mixed-Case-Path'],
    ]
    const baseDir = `${import.meta.dirname}/../..`
    for (const [test, expected] of cases) {
        const testPath = `${baseDir}/test/path/${test}`
        const path = await getCurrentPathCase(testPath)
        const lastFile = path.split(/\\|\//).pop()!
        assertEquals(lastFile, expected)
    }
})