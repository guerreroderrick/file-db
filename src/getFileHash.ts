import { ExternalHasher } from "./hash/externalHash.ts";

export async function getFileHash(filePath: string) {
    await using hasher = new ExternalHasher({})
    const [[hash]] = await hasher.hashFiles([filePath])
    return hash
}
