import { assertEquals } from 'jsr:@std/assert/equals'
import { getSizeDescription } from './getSizeDescription.ts';

Deno.test(function testGetSizeDescription() {
    const cases: [test: number, expected: string][] = [
        [0, '0'],
        [1023, '1023'],
        [1024, '1K'],
        [1024 * 1024 - 1, '1023.999K'],
        [1024 * 1024, '1M'],
        [(1024 * 1024 - 1) * 1024, '1023.999M'],
        [1024 * 1024 * 1024, '1G'],
        [(1024 * 1024 - 1) * 1024 * 1024, '1023.999G'],
        [1024 * 1024 * 1024 * 1024, '1T'],
    ]
    for (const [test, expected] of cases) {
        const actual = getSizeDescription(test)
        const compare = `${actual.size}${actual.suffix}`
        assertEquals(compare, expected)
    }
})
