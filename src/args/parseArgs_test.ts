import { assertThrows } from '@std/assert/throws'
import { assertEquals } from '@std/assert/equals'
import { parseArgs } from "./parseArgs.ts";

Deno.test(function testEmptyArgs() {
    assertThrows(() => parseArgs([]), Error, 'Usage')
})

Deno.test(function testNormalizeArgs() {
    const args = parseArgs(['--normalize'])
    assertEquals(args.paramSet, 'normalize')
})