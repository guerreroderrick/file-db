import { assert } from "@std/assert/assert";

export type FileEntry = [
    path: string,
    size: number,
    lastModified: number,
]

export async function listFiles(rootPath: string) {
    const results: FileEntry[] = []
    const paths = [rootPath]
    while (paths.length > 0) {
        const path = paths.shift()!
        const stat = await Deno.stat(path)
        if (stat.isDirectory) {
            for await (const entry of Deno.readDir(path)) {
                paths.push(`${path}/${entry.name}`)
            }
        } else {
            const mtime = stat.mtime
            assert(mtime !== null, `System doesn't provide modify time for ${path}`)

            results.push([path, stat.size, mtime.getTime()])
        }
    }
    return results
}

export function listFilesSync(rootPath: string) {
    const results: FileEntry[] = []
    const paths = [rootPath]
    while (paths.length > 0) {
        const path = paths.shift()!
        const stat = Deno.statSync(path)
        if (stat.isDirectory) {
            for (const entry of Deno.readDirSync(path)) {
                paths.push(`${path}/${entry.name}`)
            }
        } else {
            const mtime = stat.mtime
            assert(mtime !== null, `System doesn't provide modify time for ${path}`)

            results.push([path, stat.size, mtime.getTime()])
        }
    }
    return results
}
