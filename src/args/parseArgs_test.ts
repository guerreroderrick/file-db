import { assertEquals } from '@std/assert/equals'
import { DEFAULT_DB_PATH, parseArgs } from './parseArgs.ts'
import { assert } from '@std/assert/assert'
import { assertStringIncludes } from '@std/assert/string-includes'
import { assertSnapshot } from '@std/testing/snapshot'

Deno.test(function testEmptyArgs() {
    const args = parseArgs([])
    assertEquals(args.paramSet, 'error')
})

Deno.test(function testHelpArgs() {
    for (const arg of ['--help']) {
        const args = parseArgs([arg])
        assertEquals(args.paramSet, 'help')
    }
})

Deno.test(function testHelpArgsWithCommand() {
    const cases: [string, string][] = [
        [ '--help', 'ignore'],
        [ '--help', 'show-tree'],
        [ '--help', 'sync'],
    ]
    for (const [arg, command] of cases) {
        const args = parseArgs([arg, command])
        assert(args.paramSet === 'help', `paramSet should be 'help' for ${arg} ${command}`)
        assertStringIncludes(args.helpText, `${command}`, `For params ${[arg, command]}`)
    }
})

Deno.test(function testHelpArgsWithUnknownCommand() {
    const args = parseArgs(['help', 'unknown'])
    assert(args.paramSet === 'error')
})

Deno.test(function parseArgs_whenClean_parsesCorrectly() {
    const cases: [argSet: string[], paramSet: { dryRun: boolean, dbPath: string }][] = [
        [['clean'], { dryRun: false, dbPath: DEFAULT_DB_PATH, }],
        [['clean', '--dry-run'], { dryRun: true, dbPath: DEFAULT_DB_PATH, }],
        [['clean', '--db-path', 'test'], { dryRun: false, dbPath: 'test', }],
        [['clean', '--dry-run', '--db-path', 'test'], { dryRun: true, dbPath: 'test', }],
        [['clean', '--db-path', 'test', '--dry-run'], { dryRun: true, dbPath: 'test', }],
    ]
    for (const [argSet, paramSet] of cases) {
        const result = parseArgs(argSet)
        assert(result.paramSet === 'clean', `'${result.paramSet}' !== 'clean' for argSet: '${argSet}'`)
        assertEquals(result.dryRun, paramSet.dryRun)
        assertEquals(result.dbPath, paramSet.dbPath)
    }
})

Deno.test(async function parseArgs_whenCleanError_parsesError(snapshot) {
    const args = parseArgs(['clean', '--dryrun'])
    assert(args.paramSet === 'error')
    assert(args.error !== undefined)
    assert(args.helpText !== undefined)
    assert(`${args.error} ${args.helpText}`, 'clean')
    await assertSnapshot(snapshot, args)
})

Deno.test(function testShowTreeAny() {
    const args = parseArgs(['show-tree'])
    assert(args.paramSet === 'show-tree', `show-tree param set was actually ${JSON.stringify(args)}`)
    assertEquals(args.depth, 5)
    assertEquals(args.hostname, { isAnyHost: true })
    assertEquals(args.path, { isAnyPath: true })
})

Deno.test(function testShowTreeErrors() {
    const cases: string[][] = [
        ['--depth=A'], ['--depth=-1'],
        ['--hostname='],
        ['--path='],
        ['--depth=3', '--depth=2'],
        ['--hostname=host1', '--hostname=host2'],
        ['--path=C:\\path1', '--path=C:\\path2'],
    ]
    for (const args of cases) {
        const parsedArgs = parseArgs(['show-tree', ...args])
        assert(parsedArgs.paramSet === 'error')
    }
})

Deno.test(function testShowTreeArgs() {
    const args = parseArgs(['show-tree', '--depth', '3', '--hostname', 'host1', '--path', 'C:\\path name'])
    assert(args.paramSet === 'show-tree')
    assertEquals(args.depth, 3)
    assertEquals(args.hostname, { isAnyHost: false, host: 'host1' })
    assertEquals(args.path, { isAnyPath: false, prefix: 'C:\\path name' })
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
    assert(args.paramSet === 'ignore action', `Expected 'ignore action' but got '${args.paramSet}' in ${JSON.stringify(args)}`)
    assertEquals(args.action, 'add')
    assertEquals(args.filePath, 'filePath')
})

Deno.test(function testAddIgnorePathError() {
    const args = parseArgs(['ignore', 'error'])
    assert(args.paramSet === 'error')
    assertStringIncludes(args.error, 'Invalid parameters for ignore')
    assert(args.helpText !== undefined, `helpText should be defined in ${JSON.stringify(args)}`)
})