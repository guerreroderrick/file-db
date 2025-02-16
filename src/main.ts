import { assert } from "@std/assert/assert";
import { DB } from '../deps.ts'
import { assertEquals } from "@std/assert/equals";
import { getFileHash, getFileHashSync } from "./getFileHash.ts";
import { DIGEST_ALGORITHM_NAMES } from "jsr:@std/crypto/crypto";

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
    assert(args.length === 2, `Usage: file-db <digest-algorithms> <file-path>, received '${args}'`)

    const [digestAlgorithms, rootPath] = args
    const startTime = Date.now()
    const algorithms = digestAlgorithms.split(',')
        .map((algorithm)=> {
            const match = DIGEST_ALGORITHM_NAMES.find(name => name === algorithm.trim().toUpperCase())
            assert(match !== undefined, `Invalid digest algorithm: ${algorithm}`)
            return match
        })
    
    const fileList = await listFiles(rootPath)
    const listFilesAsyncTime = Date.now()
    console.log(`List files async time: ${listFilesAsyncTime - startTime}ms`)

    const syncFileList = listFilesSync(rootPath)
    const listFilesSyncTime = Date.now()
    console.log(`List files sync time: ${listFilesSyncTime - listFilesAsyncTime}ms`)

    assertEquals(fileList, syncFileList)

    const goStartTime = Date.now()
    const goHashFiles = await externalHash(fileList)
    console.log(`Go hash time: ${Date.now() - goStartTime}ms`)

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

        if (algorithm === 'SHA-256') {
            const goHashes = goHashFiles.map(([hash]) => hash)
            assertEquals(hashes, goHashes, `Hashes do not match for algorithm: ${algorithm}`)
        }
    }
}

async function listFiles(rootPath: string) {
    const results: string[] = []
    const paths = [rootPath]
    while (paths.length > 0) {
        const path = paths.shift()!
        const stat = await Deno.stat(path)
        if (stat.isDirectory) {
            for await (const entry of Deno.readDir(path)) {
                paths.push(`${path}/${entry.name}`)
            }
        } else {
            results.push(path)
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

async function externalHash(fileList: string[]) {
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
