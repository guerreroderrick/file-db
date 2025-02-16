import { DigestAlgorithm } from "jsr:@std/crypto/crypto";
import { crypto } from 'jsr:@std/crypto'
import { encodeHex } from 'jsr:@std/encoding/hex'

export async function getFileHash(filePath: string, algorithm?: DigestAlgorithm) {
    algorithm ??= 'SHA-256'

    const file = await Deno.open(filePath, { read: true })
    const stream = file.readable
    const hashBytes = await crypto.subtle.digest(algorithm, stream)

    const hash = encodeHex(hashBytes)
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
