import { assertEquals } from 'jsr:@std/assert/equals'
import { assertThrows } from 'jsr:@std/assert/throws'
import { getCanonicalPath, getCanonicalPathType, PathType } from "./getCanonicalPath.ts";

Deno.test(function testDrivePathsUseBackslash() {
    const cases: [test: string, expected: string][] = [
        ['C:\\foo\\bar', 'C:\\foo\\bar'],
        ['C:/foo/bar', 'C:\\foo\\bar'],
        ['C:/foo\\bar', 'C:\\foo\\bar'],
        ['C:\\foo/bar', 'C:\\foo\\bar'],
    ]
    for (const [test, expected] of cases) {
        const actual = getCanonicalPath(test)
        assertEquals(actual, expected)
    }
})

Deno.test(function testUNCPathsUseBackslash() {
    const cases: [test: string, expected: string][] = [
        ['\\\\server\\share\\foo\\bar', '\\\\server\\share\\foo\\bar'],
        ['//server/share/foo/bar', '\\\\server\\share\\foo\\bar'],
        ['//server/share/foo\\bar', '\\\\server\\share\\foo\\bar'],
        ['\\\\server\\share/foo/bar', '\\\\server\\share\\foo\\bar'],
    ]
    for (const [test, expected] of cases) {
        const actual = getCanonicalPath(test)
        assertEquals(actual, expected)
    }
})

Deno.test(function testUnixPathsUseForwardSlash() {
    const cases: [test: string, expected: string][] = [
        ['/foo/bar', '/foo/bar'],
        ['/foo\\bar', '/foo/bar'],
        ['\\foo/bar', '/foo/bar'],
        ['\\foo\\bar', '/foo/bar'],
    ]
    for (const [test, expected] of cases) {
        const actual = getCanonicalPath(test)
        assertEquals(actual, expected)
    }
})

Deno.test(function testDotPathsAreResolved() {
    const cases: [test: string, expected: string][] = [
        ['/foo/./bar', '/foo/bar'],
        ['/foo/bar/.', '/foo/bar'],
        ['/foo/bar/..', '/foo'],
        ['/foo/bar/../baz', '/foo/baz'],
        ['/foo/bar/../baz/..', '/foo'],
        ['/foo/bar/../baz/../..', '/'],
        ['/foo/bar/../baz/../../..', '/'],
        ['c:\\foo\\.\\bar', 'C:\\foo\\bar'],
        ['c:\\foo\\bar\\.', 'C:\\foo\\bar'],
        ['c:\\foo\\bar\\..', 'C:\\foo'],
        ['c:\\foo\\bar\\..\\baz', 'C:\\foo\\baz'],
        ['c:\\foo\\bar\\..\\baz\\..', 'C:\\foo'],
        ['c:\\foo\\bar\\..\\baz\\..\\..', 'C:\\'],
        ['c:\\foo\\bar\\..\\baz\\..\\..\\..', 'C:\\'],
    ]
    for (const [test, expected] of cases) {
        const actual = getCanonicalPath(test)
        assertEquals(actual, expected)
    }
})

Deno.test(function testRelativePathsThrow() {
    const cases: string[] = [
        'foo',
        'foo/bar',
        'foo\\bar',
    ]
    for (const test of cases) {
        assertThrows(() => getCanonicalPath(test))
    }
})

Deno.test(function testGetCanonicalPathType() {
    const cases: [test: string, expectedType: PathType][] = [
        ['C:\\foo\\bar', 'windows'],
        ['\\\\server\\share\\foo\\bar', 'unc'],
        ['/test/path', 'unix'],
    ]
    for (const [test, expectedType] of cases) {
        const { type } = getCanonicalPathType(test)
        assertEquals(type, expectedType)
    }
})
