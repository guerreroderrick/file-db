import { assert } from 'jsr:@std/assert/assert'
import { getCanonicalPath } from "./path/getCanonicalPath.ts";

export type FileEntry = {
    path: string,
    size: number,
    lastModified: number,
}
export type PathError = {
    path: string,
    error: unknown,
}
export type ListFileResult = (FileEntry & { isSuccess: true, })
    | (PathError & { isSuccess: false })
export function isFileEntry(entry: ListFileResult): entry is FileEntry & { isSuccess: true, } {
    return entry.isSuccess
}

export async function listFiles(rootPath: string) {
    const results: ListFileResult[] = []
    const paths = [rootPath]
    while (paths.length > 0) {
        const nextPath = paths.shift()!
        const path = getCanonicalPath(nextPath)
        const { stat, error, } = await tryStat(path)
        if (stat === undefined) {
            results.push([false, path, error])
        } else if (stat.isDirectory) {
            for await (const entry of Deno.readDir(path)) {
                paths.push(`${path}/${entry.name}`)
            }
        } else {
            const mtime = stat.mtime
            assert(mtime !== null, `System doesn't provide modify time for ${path}`)

            results.push([true, path, stat.size, mtime.getTime()])
        }
    }
    return results
}
async function tryStat(path: string): Promise<
    { stat: Deno.FileInfo, error: undefined }
    | { stat: undefined, error: unknown }>
{
    try {
        const stat = await Deno.stat(path)
        return { stat, error: undefined, }
    } catch (error) {
        return { stat: undefined, error, }
    }
}

export function listFilesSync(rootPath: string) {
    const results: FileEntry[] = []
    const paths = [rootPath]
    while (paths.length > 0) {
        const nextPath = paths.shift()!
        const path = getCanonicalPath(nextPath)
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
