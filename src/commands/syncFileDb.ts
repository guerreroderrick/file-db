import { addFileListing } from "../db/addFileListing.ts";
import { addPathError } from "../db/addPathError.ts";
import { getDefaultDatabase } from "../db/getDefaultDatabase.ts";
import { updateFileHash } from "../db/updateFileHash.ts";
import { ExternalHasher } from "../hash/externalHash.ts";
import { getCurrentPathCase } from "../path/getCurrentPathCase.ts";
import { isFileEntry, isPathError, listFilesIterable } from "../path/listFiles.ts";
import { assertEquals } from "@std/assert/equals";

type SuccessHash = {
    hash: string
}
type HashError = {
    error: string
}
type HashResponse = (SuccessHash | HashError) & {
    file: string
    timeMs: number
}

class PooledHashUpdate {
    private static readonly cleanupSize = 10
    private poolSize: number
    private hashers: Promise<[index: number, hasher: ExternalHasher]>[] = []
    private taskQueue: Promise<void>[] = []

    public constructor(poolSize: number) {
        this.poolSize = poolSize
    }

    requestHash(path: string, callback: (response: HashResponse) => void): void {
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
    private async placeEntry(path: string, callback: (response: HashResponse) => void) {
        const [index, hasher] = await Promise.race(this.hashers)
        this.hashers[index] = (async () => {
            const start = Date.now()
            const [[hash, file]] = await hasher.hashFiles([path])
            assertEquals(file, path)
    
            const timeMs = Date.now() - start
            if (hash.startsWith('Error: ')) {
                callback({ error: hash, file, timeMs })
                return [index, hasher]
            }
            callback({ hash, file, timeMs })
            return [index, hasher]
        })()
    }
}

export async function syncFileDb(filePath: string) {

    const hasher = new PooledHashUpdate(4)
    try {
        return await syncFileDb_withHasher(hasher, filePath)
    } finally {
        hasher[Symbol.asyncDispose]()
    }
}

async function syncFileDb_withHasher(hasher: PooledHashUpdate, filePath: string) {

    const hostname = Deno.hostname()
    const db = getDefaultDatabase();

    let numPathErrors = 0
    let numFiles = 0
    let lastOutput = Date.now()
    const encoder = new TextEncoder()
    const currentCaseFilePath = await getCurrentPathCase(filePath)
    if (currentCaseFilePath !== filePath) {
        console.log({ debug: `Path case changed '${currentCaseFilePath}'` })
    }
    for await (const entry of listFilesIterable(currentCaseFilePath)) {
        if (Date.now() - lastOutput > 1000) {
            await Deno.stdout.write(encoder.encode(`\rNumPathErrors: ${numPathErrors}, NumFiles: ${numFiles}...`))
            lastOutput = Date.now()
        }
        if (isPathError(entry)) {
            numPathErrors++
            console.log({ pathError: entry.path, })
            lastOutput = Date.now()
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
                hasher.requestHash(path, (response: HashResponse) => {
                    if ('error' in response) {
                        const { error, file, timeMs, } = response
                        console.error({ error, file, timeMs, })
                        lastOutput = Date.now()
                        addPathError({
                            db,
                            hostname,
                            pathError: { path: file, error, },
                        })
                        return
                    }
                    const { hash, timeMs, } = response
                    console.log({ path, size, hash, timeMs, })
                    lastOutput = Date.now()
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
