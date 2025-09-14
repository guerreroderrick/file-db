import { assert } from '@std/assert/assert'
import { getCanonicalPath } from "./getCanonicalPath.ts";
import { tryCatch } from "../util/tryCatch.ts";

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
export function isPathError(entry: ListFileResult): entry is PathError & { isSuccess: false } {
    return !entry.isSuccess
}

export type ListFilesIterableParams = {
    rootPath: string,
    filter: (path: string) => boolean,
}
export async function* listFilesIterable({
    rootPath,
    filter,
}: ListFilesIterableParams) {
    const paths = [rootPath]
    while (paths.length > 0) {
        const nextPath = paths.shift()!
        const path = getCanonicalPath(nextPath)
        if (!filter(path)) { continue }

        const tryStat = await tryCatch(() => Deno.stat(path))

        if (tryStat.error) {
            const pathError: ListFileResult = {
                isSuccess: false,
                path,
                error: tryStat.error,
            }
            yield pathError
            continue
        }
        const { value: stat } = tryStat
        if (stat.isDirectory) {
            try {
                const addPaths = []
                for await (const entry of Deno.readDir(path)) {
                    addPaths.push(`${path}/${entry.name}`)
                }
                paths.push(...addPaths)
            } catch (error) {
                const pathError: ListFileResult = {
                    isSuccess: false,
                    path,
                    error,
                }
                yield pathError
            }
        } else {
            const mtime = stat.mtime
            assert(mtime !== null, `System doesn't provide modify time for ${path}`)

            const fileEntry: ListFileResult = {
                isSuccess: true,
                path,
                size: stat.size,
                lastModified: mtime.getTime()
            }
            yield fileEntry
        }
    }
}
