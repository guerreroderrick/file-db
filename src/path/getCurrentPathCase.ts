import { getCanonicalPathType } from "./getCanonicalPath.ts";

export async function getCurrentPathCase(filePath: string) {
    const { path: canonicalPath, type } = getCanonicalPathType(filePath)

    let slashDirection = '/'
    switch (type) {
        case 'unix': break
        case 'windows': // fallthrough
        case 'unc': {
            slashDirection = '\\'
            break
        }
        default: { const _: never = type }
    }
    const pathParts = canonicalPath.split(slashDirection)
    for (let i = pathParts.length - 1; i > 0; i--) {
        const parent = [...pathParts.slice(0, i), '']
            .join(slashDirection)
        const current = pathParts[i]
        const matching = await getMatchingDirectoryEntries(parent, current)
        if (matching.length === 0) {
            throw new Error(`Path not found under '${parent}': ${current}`)
        }
        if (matching.length > 1) {
            if (!pathParts.includes(current)) {
                const matches = matching.join(', ')
                throw new Error(`Exact match not found with multiple matches under ${parent}: ${current}\n${matches}`)
            }
            continue
        }

        pathParts[i] = matching[0]
    }
    return pathParts.join(slashDirection)
}

async function getMatchingDirectoryEntries(parent: string, current: string) {
    const matching: string[] = []
    const lowerCurrent = current.toLowerCase()
    for await (const entry of Deno.readDir(parent)) {
        if (entry.name.toLowerCase() === lowerCurrent) {
            matching.push(entry.name)
        }
    }
    return matching
}
