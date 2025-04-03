import { assert } from 'jsr:@std/assert'
import { assertSnapshot } from 'jsr:@std/testing/snapshot'
import { ExternalHasher } from "./externalHash.ts";

const baseDirectory = import.meta.dirname
assert(baseDirectory)
const rootDirectory = `${baseDirectory}/../..`

async function getFileHash(filePath: string) {
    await using hasher = new ExternalHasher({})
    const [[hash]] = await hasher.hashFiles([filePath])
    return hash
}

Deno.test(async function testGetFileHash_text(snaps) {
    const hash = await getFileHash(`${rootDirectory}/test/data/text-data.txt`)
    await assertSnapshot(snaps, hash)
})

Deno.test(async function testGetFileHash_binary(snaps) {
    const hash = await getFileHash(`${rootDirectory}/test/data/text-data.zip`)
    await assertSnapshot(snaps, hash)
})
