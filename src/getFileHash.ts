import { crypto } from 'jsr:@std/crypto'
import { encodeHex } from 'jsr:@std/encoding/hex'

export async function getFileHash(filePath: string) {
    const file = await Deno.open(filePath, { read: true })
    const stream = file.readable
    const hashBytes = await crypto.subtle.digest('SHA-256', stream)

    const hash = encodeHex(hashBytes)
    return hash
}
