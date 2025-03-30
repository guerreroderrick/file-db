import { DigestAlgorithm } from "jsr:@std/crypto/crypto";
import { crypto } from 'jsr:@std/crypto'
import { encodeHex } from 'jsr:@std/encoding/hex'
import { ExternalHasher } from "./hash/externalHash.ts";

export async function getFileHash(filePath: string) {
    await using hasher = new ExternalHasher({})
    const [[hash]] = await hasher.hashFiles([filePath])
    return hash
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
