import { assert } from "@std/assert/assert";
import { DB } from '../deps.ts'
import { assertEquals } from "@std/assert/equals";
import { getFileHash, getFileHashSync } from "./getFileHash.ts";
import { DIGEST_ALGORITHM_NAMES } from "jsr:@std/crypto/crypto";
import { getSizeDescription } from "./getSizeDescription.ts";

if (import.meta.main) {
    const db = new DB('.file-db.sqlite')
    db.execute(`
        create table if not exists config (
            key text primary key,
            value text
            )
    `)

    const cleanup = (normal?: boolean) => {
        db.close()
        if (!normal) {
            console.warn('Abnormal exit.')
            Deno.exit(1)
        }
    }
    const handleSignal = (signal: Deno.Signal) =>
        () => {
            console.log(`Received signal: ${signal}`)
            cleanup()
        }

    Deno.addSignalListener('SIGINT', handleSignal('SIGINT'))
    Deno.addSignalListener('SIGBREAK', handleSignal('SIGBREAK'))
    if (Deno.build.os !== 'windows') {
        Deno.addSignalListener('SIGTERM', handleSignal('SIGTERM'))
    }
    try {
        await main(Deno.args)
    } finally {
        cleanup(true)
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
    
    const listedFiles = await listFiles(rootPath)
    const listFilesAsyncTime = Date.now()
    console.log(`List files async time: ${listFilesAsyncTime - startTime}ms`)

    const fileList = listedFiles.map(([path]) => path)

    const syncFileList = listFilesSync(rootPath)
    const listFilesSyncTime = Date.now()
    console.log(`List files sync time: ${listFilesSyncTime - listFilesAsyncTime}ms`)

    assertEquals(fileList, syncFileList)

    const goHashFiles: [hash: string, file: string][] = []
    if (includeExternalTest) {
        const goStartTime = Date.now()
        const goResult = await externalHash(fileList)
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
        const smallIterations = 100
        const largeIterations = 30

        const sentinelLargest: [path: string, size: number] = ['<Invalid>', Infinity]
        const sentinelSmallest: [path: string, size: number] = ['<Invalid>', 0]

        const smallestFile = listedFiles.reduce((smallest, [path, size]) => {
            if (size > 0 && size < (smallest?.[1] ?? Infinity)) {
                return [path, size]
            }
            return smallest
        }, sentinelLargest)
        const largestFile = listedFiles.reduce((largest, [path, size]) => {
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
        for (let i = 0; i < smallIterations; i++) {
            const hash = await externalHash([smallestFile[0]], true)
            assertEquals(hash[0][0], smallestHash)
        }
        console.log(`Small file (${smallestSize}) external hash time stdin: ${Date.now() - startTime}ms`)

        startTime = Date.now()
        for (let i = 0; i < smallIterations; i++) {
            const hash = await externalHash([smallestFile[0]], false)
            assertEquals(hash[0][0], smallestHash)
        }
        console.log(`Small file (${smallestSize}) external hash time arg: ${Date.now() - startTime}ms`)

        startTime = Date.now()
        for (let i = 0; i < smallIterations; i++) {
            const hash = getFileHashSync(smallestFile[0], 'SHA-256')
            assertEquals(hash, smallestHash)
        }
        console.log(`Small file (${smallestSize}) internal hash time: ${Date.now() - startTime}ms`)

        startTime = Date.now()
        for (let i = 0; i < largeIterations; i++) {
            const hash = await externalHash([largestFile[0]], true)
            assertEquals(hash[0][0], largestHash)
        }
        console.log(`Large file (${largestSize}) external hash time stdin: ${Date.now() - startTime}ms`)

        startTime = Date.now()
        for (let i = 0; i < largeIterations; i++) {
            const hash = await externalHash([largestFile[0]], false)
            assertEquals(hash[0][0], largestHash)
        }
        console.log(`Large file (${largestSize}) external hash time arg: ${Date.now() - startTime}ms`)

        startTime = Date.now()
        for (let i = 0; i < largeIterations; i++) {
            const hash = getFileHashSync(largestFile[0], 'SHA-256')
            assertEquals(hash, largestHash)
        }
        console.log(`Large file (${largestSize}) internal hash time: ${Date.now() - startTime}ms`)
    }
}

async function listFiles(rootPath: string) {
    const results: [path: string, size: number][] = []
    const paths = [rootPath]
    while (paths.length > 0) {
        const path = paths.shift()!
        const stat = await Deno.stat(path)
        if (stat.isDirectory) {
            for await (const entry of Deno.readDir(path)) {
                paths.push(`${path}/${entry.name}`)
            }
        } else {
            results.push([path, stat.size])
        }
    }
    return results
}

function listFilesSync(rootPath: string) {
    const results: string[] = []
    const paths = [rootPath]
    while (paths.length > 0) {
        const path = paths.shift()!
        const stat = Deno.statSync(path)
        if (stat.isDirectory) {
            for (const entry of Deno.readDirSync(path)) {
                paths.push(`${path}/${entry.name}`)
            }
        } else {
            results.push(path)
        }
    }
    return results
}

async function externalHash(fileList: string[], forceStdin = false) {
    const useStdIn = forceStdin || fileList.length > 8

    const launch = useStdIn
        ? async () => {
            const cmd = new Deno.Command('./go/file-db-go.exe', {
                args: ['hash-files', '-'],
                stdin: 'piped',
                stdout: 'piped',
            })
            const child = cmd.spawn()
            assert(child.stdin !== null)
            const writer = child.stdin.getWriter()
            await writer.write(new TextEncoder().encode(fileList.join('\n')))
            await writer.close()
            return child
        } : () => {
            const cmd = new Deno.Command('./go/file-db-go.exe', {
                args: ['hash-files', ...fileList],
                stdin: 'piped',
                stdout: 'piped',
            })
            const child = cmd.spawn()
            return child
        }
    
    const child = await launch()
    const results = await Promise.all([
        child.status,
        readLines(child.stdout),
    ])
    assert(results[1].length === fileList.length, `Expected ${fileList.length} results, got ${results[1].length}`)
    const [status, hashes] = results
    assert(status.success, `External process failed with status: ${status.code}`)
    return hashes
}

async function readLines(stdout: ReadableStream<Uint8Array>) {
    const results: [hash: string, file: string][] = []
    const decoder = new TextDecoder()
    const reader = stdout.getReader()
    while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const buffer = decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        for (const line of lines.filter((line) => line.length > 0)) {
            const [hash, file] = line.split('\t')
            results.push([hash, file])
        }
    }
    return results
}
