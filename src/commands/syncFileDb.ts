import { addFileListing } from "../db/addFileListing.ts";
import { addPathError } from "../db/addPathError.ts";
import { getDefaultDatabase } from "../db/getDefaultDatabase.ts";
import { updateFileHash } from "../db/updateFileHash.ts";
import { ExternalHasher } from "../hash/externalHash.ts";
import { isFileEntry, isPathError, listFilesIterable } from "../listFiles.ts";
import { assertEquals } from "@std/assert/equals";

class PooledHashUpdate {
    private static readonly cleanupSize = 10
    private poolSize: number
    private hashers: Promise<[index: number, hasher: ExternalHasher]>[] = []
    private taskQueue: Promise<void>[] = []

    public constructor(poolSize: number) {
        this.poolSize = poolSize
    }

    requestHash(path: string, callback: (hash: string) => void): void {
        if (this.hashers.length < this.poolSize) {
            const hasher = new ExternalHasher({})
            this.hashers.push(Promise.resolve([this.hashers.length, hasher]))
        } else if (this.taskQueue.length >= PooledHashUpdate.cleanupSize) {
            this.taskQueue.push(this.cleanupQueue())
        }
        this.taskQueue.push(this.placeEntry(path, callback))
    }

    async [Symbol.asyncDispose]() {
        await this.cleanupQueue()
        const cleanupHashers = (await Promise.all(this.hashers))
            .map(([_, hasher]) => hasher[Symbol.asyncDispose]())
        await Promise.all(cleanupHashers)
    }

    private async cleanupQueue() {
        const last = this.taskQueue
        this.taskQueue = []
        await Promise.allSettled(last)
    }
    private async placeEntry(path: string, callback: (hash: string) => void) {
        const [index, hasher] = await Promise.race(this.hashers)
        this.hashers[index] = (async () => {
            const [[hash, file]] = await hasher.hashFiles([path])
            assertEquals(file, path)
    
            callback(hash)
            return [index, hasher]    
        })()
    }
}

export async function syncFileDb(filePath: string) {
    const hostname = Deno.hostname()
    const db = getDefaultDatabase();

    let numPathErrors = 0
    let numFiles = 0
    await using hasher = new PooledHashUpdate(4)
    for await (const entry of listFilesIterable(filePath)) {
        if (isPathError(entry)) {
            numPathErrors++
            console.log({ pathError: entry.path, })
            addPathError({
                db,
                hostname,
                pathError: entry,
            })
            continue
        }
        if (isFileEntry(entry)) {
            numFiles++
            const { hash: existingHash } = addFileListing({
                db,
                hostname,
                file: entry,
            })
            const { path, size, } = entry

            if (existingHash === null && size > 0) {
                hasher.requestHash(path, hash => {
                    console.log({ path, size, hash })
                    updateFileHash({
                        db,
                        hostname,
                        file: entry,
                        hash,
                    })
                })
            }
        }
    }
    console.log({
        debug: 'Iteration complete',
        numFiles,
        numPathErrors,
    })
    return { numFiles, numPathErrors, }
}
