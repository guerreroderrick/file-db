import { assert } from 'jsr:@std/assert/assert'
import * as path from 'jsr:@std/path'

export type PathType = 'windows' | 'unc' | 'unix'
export function getCanonicalPath(filePath: string) {
    return getCanonicalPathType(filePath).path
}

export function getCanonicalPathType(filePath: string): { path: string, type: PathType } {
    assert(path.isAbsolute(filePath), `Path must be absolute, resolve to absolute path first: ${filePath}`)

    const normalized = path.normalize(filePath)
    if (normalized.match(/^[a-z]:[\\/]/i)) {
        const drive = normalized.charAt(0).toUpperCase()
        const remainder = normalized.slice(2).replaceAll('/', '\\')
        return {
            type: 'windows',
            path: `${drive}:${remainder}`,
        }
    }
    if (normalized.startsWith('\\\\') || normalized.startsWith('//')) {
        return {
            type: 'unc',
            path: normalized.replaceAll('/', '\\'),
        }
    }
    return {
        type: 'unix',
        path: normalized.replaceAll('\\', '/'),
    }
}
