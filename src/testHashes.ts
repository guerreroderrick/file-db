import { assert } from "@std/assert/assert";
import { assertEquals } from "@std/assert/equals";
import { getFileHash, getFileHashSync } from "./getFileHash.ts";
import { DIGEST_ALGORITHM_NAMES } from "jsr:@std/crypto/crypto";
import { getSizeDescription } from "./getSizeDescription.ts";
import { performRegularCleanup, registerProcessCleanup } from "./registerProcessCleanup.ts";
import { isFileEntry, listFiles, listFilesSync } from "./listFiles.ts";
import { externalHash, ExternalHasher } from "./hash/externalHash.ts";

if (import.meta.main) {
    registerProcessCleanup(() => {})
    try {
        await main(Deno.args)
    } finally {
        performRegularCleanup()
    }
}

async function main(args: string[]) {
    assert(args.length >= 2 && args.length <= 3, `Usage: file-db <digest-algorithms|--skip-digests> <file-path> [--include-external-test], received '${args}'`)

    const [
        digestAlgorithms,
        rootPath,
        argIncludeExternalTest,
    ] = args
    assert(argIncludeExternalTest === '--include-external-test' || argIncludeExternalTest === undefined, `Invalid argument: ${argIncludeExternalTest}`)
    const includeExternalTest = argIncludeExternalTest === '--include-external-test'

    const startTime = Date.now()
    const algorithms = digestAlgorithms === '--skip-digests'
        ? [] 
        : digestAlgorithms.split(',')
        .map((algorithm)=> {
            const match = DIGEST_ALGORITHM_NAMES.find(name => name === algorithm.trim().toUpperCase())
            assert(match !== undefined, `Invalid digest algorithm: ${algorithm}`)
            return match
        })
    
    const listedFiles = (await listFiles(rootPath))
        .filter(isFileEntry)
    const listFilesAsyncTime = Date.now()
    console.log(`List files async time: ${listFilesAsyncTime - startTime}ms`)

    const fileList = listedFiles.map(({ path }) => path)

    const syncFileList = listFilesSync(rootPath)
        .filter(isFileEntry)
    const syncFilePaths = syncFileList.map(({ path }) => path)
    const listFilesSyncTime = Date.now()
    console.log(`List files sync time: ${listFilesSyncTime - listFilesAsyncTime}ms`)

    assertEquals(fileList, syncFilePaths)

    const goHashFiles: [hash: string, file: string][] = []
    if (includeExternalTest) {
        const goStartTime = Date.now()
        const goResult = await externalHash({ fileList })
        console.log(`Go hash time: ${Date.now() - goStartTime}ms`)
        goHashFiles.push(...goResult)
    }

    for (const algorithm of algorithms) {
        const nextStartTime = Date.now()
        await Promise.all(fileList.map(async (file) => {
            await getFileHash(file, algorithm)
        }))
        const hashTime = Date.now()
        console.log(`${algorithm} hash time: ${hashTime - nextStartTime}ms`)

        const hashes = fileList.map((file) => {
            return getFileHashSync(file, algorithm)
        })
        const hashSyncTime = Date.now()
        console.log(`${algorithm} hash sync time: ${hashSyncTime - hashTime}ms`)

        if (includeExternalTest && algorithm === 'SHA-256') {
            const goHashes = goHashFiles.map(([hash]) => hash)
            assertEquals(hashes, goHashes, `Hashes do not match for algorithm: ${algorithm}`)
            console.log(`Go and SHA-256 hashes match for ${hashes.length} files`)
        }
    }

    if (includeExternalTest) {
        const smallIterations = 50
        const largeIterations = 20

        const sentinelLargest: [path: string, size: number] = ['<Invalid>', Infinity]
        const sentinelSmallest: [path: string, size: number] = ['<Invalid>', 0]

        const smallestFile = listedFiles
            .map(({ path, size }) => [path, size] as const)
            .reduce((smallest, [path, size]) => {
                if (size > 0 && size < (smallest?.[1] ?? Infinity)) {
                    return [path, size]
                }
                return smallest
            }, sentinelLargest)
        const largestFile = listedFiles
            .map(({ path, size }) => [path, size] as const)
            .reduce((largest, [path, size]) => {
                if (size > (largest?.[1] ?? 0)) {
                    return [path, size]
                }
                return largest
            }, sentinelSmallest)

        const smallestHash = await getFileHash(smallestFile[0], 'SHA-256')
        const smallestSizeDesc = getSizeDescription(smallestFile[1])
        const smallestSize= `${smallestSizeDesc.size} ${smallestSizeDesc.suffix}B`
        const largestHash = await getFileHash(largestFile[0], 'SHA-256')
        const largestSizeDesc = getSizeDescription(largestFile[1])
        const largestSize = `${largestSizeDesc.size} ${largestSizeDesc.suffix}B`

        let startTime = Date.now()
        
        await using hasher = new ExternalHasher({})
        for (let i = 0; i < smallIterations; i++) {
            const hash = await hasher.hashFiles([smallestFile[0]])
            assertEquals(hash[0][0], smallestHash)
        }
        console.log(`Small file (${smallestSize})x${smallIterations} external hash time reused: ${Date.now() - startTime}ms`)

        startTime = Date.now()
        for (let i = 0; i < smallIterations; i++) {
            const hash = await externalHash({
                    fileList: [smallestFile[0]],
                    forceStdin: true,
                })
            assertEquals(hash[0][0], smallestHash)
        }
        console.log(`Small file (${smallestSize})x${smallIterations} external hash time stdin: ${Date.now() - startTime}ms`)

        startTime = Date.now()
        for (let i = 0; i < smallIterations; i++) {
            const hash = await externalHash({
                    fileList: [smallestFile[0]],
                    forceStdin: false,
                })
            assertEquals(hash[0][0], smallestHash)
        }
        console.log(`Small file (${smallestSize})x${smallIterations} external hash time arg: ${Date.now() - startTime}ms`)

        startTime = Date.now()
        for (let i = 0; i < smallIterations; i++) {
            const hash = getFileHashSync(smallestFile[0], 'SHA-256')
            assertEquals(hash, smallestHash)
        }
        console.log(`Small file (${smallestSize})x${smallIterations} internal hash time: ${Date.now() - startTime}ms`)

        const hashers = new Array<number>(largeIterations)
            .fill(0)
            .map(() => new ExternalHasher({}))
        const hashes: Promise<string>[] = []
        startTime = Date.now()
        for (let i = 0; i < largeIterations; i++) {
            hashes.push(
                hashers[i].hashFiles([largestFile[0]])
                    .then(([hash]) => hash[0][0])
            )
        }
        await Promise.all(hashes)
        console.log(`Large file (${largestSize})x${largeIterations} external hash time parallel: ${Date.now() - startTime}ms`)
        for (const hasher of hashers) {
            await hasher[Symbol.asyncDispose]()
        }

        startTime = Date.now()
        for (let i = 0; i < largeIterations; i++) {
            const hash = await hasher.hashFiles([largestFile[0]])
            assertEquals(hash[0][0], largestHash)
        }
        console.log(`Large file (${largestSize})x${largeIterations} external hash time reused: ${Date.now() - startTime}ms`)

        startTime = Date.now()
        for (let i = 0; i < largeIterations; i++) {
            const hash = await externalHash({
                    fileList: [largestFile[0]],
                    forceStdin: true
                })
            assertEquals(hash[0][0], largestHash)
        }
        console.log(`Large file (${largestSize})x${largeIterations} external hash time stdin: ${Date.now() - startTime}ms`)

        startTime = Date.now()
        for (let i = 0; i < largeIterations; i++) {
            const hash = await externalHash({
                    fileList: [largestFile[0]],
                    forceStdin: false,
                })
            assertEquals(hash[0][0], largestHash)
        }
        console.log(`Large file (${largestSize})x${largeIterations} external hash time arg: ${Date.now() - startTime}ms`)

        startTime = Date.now()
        for (let i = 0; i < largeIterations; i++) {
            const hash = getFileHashSync(largestFile[0], 'SHA-256')
            assertEquals(hash, largestHash)
        }
        console.log(`Large file (${largestSize})x${largeIterations} internal hash time: ${Date.now() - startTime}ms`)
    }
}
