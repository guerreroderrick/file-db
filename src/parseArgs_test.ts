import { assertThrows } from "@std/assert/throws";
import { parseArgs } from "./file-db.ts";

Deno.test(function testEmptyArgs() {
    assertThrows(() => parseArgs([]), Error, 'Usage')
})

Deno.test(function testNormalizeArgs() {
    const args = parseArgs(['--normalize'])

})