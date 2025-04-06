import { assertEquals } from '@std/assert/equals'
import { parseArgs } from "./parseArgs.ts";
import { assert } from "@std/assert/assert";
import { assertStringIncludes } from "@std/assert/string-includes";

Deno.test(function testEmptyArgs() {
    const args = parseArgs([])
    assertEquals(args.paramSet, 'error')
})

Deno.test(function testHelpArgs() {
    for (const arg of ['help', '--help', '-h']) {
        const args = parseArgs([arg])
        assertEquals(args.paramSet, 'help')
    }
})

Deno.test(function testHelpArgsWithCommand() {
    const cases: [string, string][] = [
        [ 'help', 'sync'],
        [ '--help', 'normalize'],
    ]
    for (const [arg, command] of cases) {
        const args = parseArgs([arg, command])
        assert(args.paramSet === 'help', `paramSet should be 'help' for ${arg} ${command}`)
        assertStringIncludes(args.helpText, `${command}`)
    }
})

Deno.test(function testHelpArgsWithUnknownCommand() {
    const args = parseArgs(['help', 'unknown'])
    assert(args.paramSet === 'error')
})

Deno.test(function testNormalizeArgs() {
    const args = parseArgs(['normalize'])
    assertEquals(args.paramSet, 'normalize')
})

Deno.test(function testNormalizeArgsWithExtraArgs() {
    const args = parseArgs(['normalize', 'extra'])
    assert(args.paramSet === 'error')
    assertStringIncludes(args.error, 'Too many arguments for normalize command')
})

Deno.test(function testSyncArgs() {
    const args = parseArgs(['sync', 'filePath'])
    assert(args.paramSet === 'sync')
    assertEquals(args.filePath, 'filePath')
})

Deno.test(function testSyncArgsWithExtraArgs() {
    const args = parseArgs(['sync', 'filePath', 'extra'])
    assert(args.paramSet === 'error')
    assertStringIncludes(args.error, 'Invalid arguments for sync command')
})

Deno.test(function testSyncArgsWithNoArgs() {
    const args = parseArgs(['sync'])
    assert(args.paramSet === 'error')
    assertStringIncludes(args.error, 'Invalid arguments for sync command')
})
