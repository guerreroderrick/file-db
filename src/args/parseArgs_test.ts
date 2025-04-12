import { assertEquals } from 'jsr:@std/assert/equals'
import { parseArgs } from './parseArgs.ts'
import { assert } from 'jsr:@std/assert/assert'
import { assertStringIncludes } from 'jsr:@std/assert/string-includes'

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
        [ '-h', 'ignore'],
        [ 'help', 'show-tree'],
        [ '--help', 'sync'],
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

Deno.test(function testShowTreeAny() {
    const args = parseArgs(['show-tree'])
    assert(args.paramSet === 'show-tree')
    assertEquals(args.depth, 5)
    assertEquals(args.hostname, { isAnyHost: true })
    assertEquals(args.path, { isAnyPath: true })
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

Deno.test(function testAddIgnorePath() {
    const args = parseArgs(['ignore', 'add', 'filePath'])
    assert(args.paramSet === 'ignore action')
    assertEquals(args.action, 'add')
    assertEquals(args.filePath, 'filePath')
})

Deno.test(function testAddIgnorePathError() {
    const args = parseArgs(['ignore', 'error'])
    assert(args.paramSet === 'error')
    assertStringIncludes(args.error, 'Invalid arguments for ignore')
    assert(args.helpText !== undefined)
})