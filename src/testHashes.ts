import { assert } from "@std/assert/assert";
import { assertEquals } from "@std/assert/equals";
import { getSizeDescription } from "./util/getSizeDescription.ts";
import { performRegularCleanup, registerProcessCleanup } from "./registerProcessCleanup.ts";
import { FileEntry, isFileEntry, listFiles, listFilesIterable } from "./listFiles.ts";
import { ExternalHasher } from "./hash/externalHash.ts";

if (import.meta.main) {
    registerProcessCleanup(() => {})
    try {
        await main(Deno.args)
    } finally {
        performRegularCleanup()
    }
}

async function main(args: string[]) {
    assert(args.length >= 1 && args.length <= 2, `Usage: file-db <file-path> [--include-external-test], received '${args}'`)

    const [
        rootPath,
        argIncludeExternalTest,
    ] = args
    assert(argIncludeExternalTest === '--include-external-test' || argIncludeExternalTest === undefined, `Invalid argument: ${argIncludeExternalTest}`)
    const includeExternalTest = argIncludeExternalTest === '--include-external-test'

    const startTime = Date.now()
    
    const listedFiles = (await listFiles(rootPath))
        .filter(isFileEntry)
    const listFilesAsyncTime = Date.now()
    console.log(`List files async time: ${listFilesAsyncTime - startTime}ms`)

    const fileList = listedFiles.map(({ path }) => path)

    const generatedFileList: FileEntry[] = []
    for await (const entry of listFilesIterable(rootPath)) {
        if (isFileEntry(entry)) {
            generatedFileList.push(entry)
        }
    }
    const generatedFilePaths = generatedFileList.map(({ path }) => path)
    const listFilesIterableTime = Date.now()
    console.log(`List files iterable time: ${listFilesIterableTime - listFilesAsyncTime}ms`)
    assertEquals(fileList, generatedFilePaths)

    const goHashFiles: [hash: string, file: string][] = []
    if (includeExternalTest) {
        const goStartTime = Date.now()
        await using hasher = new ExternalHasher({})
        const goResult = await hasher.hashFiles(fileList)
        console.log(`Go hash time: ${Date.now() - goStartTime}ms`)
        goHashFiles.push(...goResult)
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

        const smallestSizeDesc = getSizeDescription(smallestFile[1])
        const smallestSize= `${smallestSizeDesc.size} ${smallestSizeDesc.suffix}B`
        const largestSizeDesc = getSizeDescription(largestFile[1])
        const largestSize = `${largestSizeDesc.size} ${largestSizeDesc.suffix}B`

        let startTime = Date.now()
        
        await using hasher = new ExternalHasher({})
        const consistentSmallHash: string[] = []
        for (let i = 0; i < smallIterations; i++) {
            const hash = await hasher.hashFiles([smallestFile[0]])
            if (i === 0) { consistentSmallHash.push(hash[0][0]) }
            assertEquals(hash[0][0], consistentSmallHash[0])
        }
        console.log(`Small file (${smallestSize})x${smallIterations} external hash time reused: ${Date.now() - startTime}ms`)

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
        const consistentLargeHash: string[] = []
        for (let i = 0; i < largeIterations; i++) {
            const hash = await hasher.hashFiles([largestFile[0]])
            if (i === 0) { consistentLargeHash.push(hash[0][0]) }
            assertEquals(hash[0][0], consistentLargeHash[0])
        }
        console.log(`Large file (${largestSize})x${largeIterations} external hash time stdin: ${Date.now() - startTime}ms`)

    }
}
