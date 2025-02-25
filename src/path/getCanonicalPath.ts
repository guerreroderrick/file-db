import * as path from 'jsr:@std/path'

export function getCanonicalPath(filePath: string) {
    if (!path.isAbsolute(filePath)) {
        throw new Error(`Path must be absolute, resolve to absolute path first: ${filePath}`)
    }
    const normalized = path.normalize(filePath)
    if (normalized.match(/^[a-z]:[\\/]/i)) {
        const drive = normalized.charAt(0).toUpperCase()
        const remainder = normalized.slice(2).replaceAll('/', '\\')
        return `${drive}:${remainder}`
    }
    if (normalized.startsWith('\\\\') || normalized.startsWith('//')) {
        return normalized.replaceAll('/', '\\')
    }
    return normalized.replaceAll('\\', '/')
}
