import { DigestAlgorithm } from "jsr:@std/crypto/crypto";
import { crypto } from 'jsr:@std/crypto'
import { encodeHex } from 'jsr:@std/encoding/hex'
import { externalHash, ExternalHasher } from "./hash/externalHash.ts";
import { assertEquals } from "@std/assert/equals";
import * as path from 'jsr:@std/path'

export async function getFileHash(filePath: string) { // }, algorithm?: DigestAlgorithm) {
    await using hasher = new ExternalHasher({})
    const [[hash]] = await hasher.hashFiles([filePath])
    return hash
/*
    algorithm ??= 'SHA-256'

    const fileInfo = Deno.statSync(filePath)
    if (algorithm === 'SHA-256' && fileInfo.size > 1024 * 1024 * 10) {
        const external = await externalHash({
            fileList: [filePath],
            commandPath: path.join(Deno.cwd(), '/go/file-db-go.exe'),
        })
        assertEquals(external.length, 1)
        const [hash] = external[0]
        return hash
    }

    const file = await Deno.open(filePath, { read: true })
    const stream = file.readable
    const hashBytes = await crypto.subtle.digest(algorithm, stream)

    const hash = encodeHex(hashBytes)
    return hash
    */
}

export function getFileHashSync(filePath: string, algorithm?: DigestAlgorithm) {
    algorithm ??= 'SHA-256'

    const file = Deno.openSync(filePath, { read: true })
    const fileInfo = Deno.statSync(filePath)
    const buffer = new Uint8Array(fileInfo.size)
    file.readSync(buffer)
    const hashBytes = crypto.subtle.digestSync(algorithm, buffer)

    const hash = encodeHex(hashBytes)
    return hash
}
