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
        const tryStat = await tryCatch(() => Deno.stat(path))

        if ('error' in tryStat) {
            results.push({ isSuccess: false, path, error: tryStat.error })
            continue
        }
        const { result: stat } = tryStat
        if (stat.isDirectory) {
            for await (const entry of Deno.readDir(path)) {
                paths.push(`${path}/${entry.name}`)
            }
        } else {
            const mtime = stat.mtime
            assert(mtime !== null, `System doesn't provide modify time for ${path}`)

            results.push({
                isSuccess: true,
                path,
                size: stat.size,
                lastModified: mtime.getTime()
            })
        }
    }
    return results
}

async function tryCatch<Result>(fn: () => Promise<Result>): Promise<
    { result: Result }
    | { error: unknown }
> {
    try {
        return { result: await fn() }
    } catch (error) {
        return { error }
    }
}
function tryCatchSync<Result>(fn: () => Result)
    : { result: Result }
    | { error: unknown }
{
    try {
        return { result: fn() }
    } catch (error) {
        return { error }
    }
}

export function listFilesSync(rootPath: string) {
    const results: ListFileResult[] = []
    const paths = [rootPath]
    while (paths.length > 0) {
        const nextPath = paths.shift()!
        const path = getCanonicalPath(nextPath)
        const tryStat = tryCatchSync(() => Deno.statSync(path))
        if ('error' in tryStat) {
            results.push({ isSuccess: false, path, error: tryStat.error })
            continue
        }
        const { result: stat } = tryStat
        if (stat.isDirectory) {
            for (const entry of Deno.readDirSync(path)) {
                paths.push(`${path}/${entry.name}`)
            }
        } else {
            const mtime = stat.mtime
            assert(mtime !== null, `System doesn't provide modify time for ${path}`)

            results.push({
                isSuccess: true,
                path,
                size: stat.size,
                lastModified: mtime.getTime()
            })
        }
    }
    return results
}
