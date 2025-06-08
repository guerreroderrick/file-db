import { isAbsolute } from 'jsr:@std/path@^1.0.8/is-absolute'
import { assert } from 'jsr:@std/assert/assert'
import { getDefaultDatabase } from "../db/getDefaultDatabase.ts";
import { addIgnorePath } from "../db/addIgnorePath.ts";

type PerformIgnoreActionParams = {
    dbPath: string
    action: string
    filePath: string
    hostname?: string
}
export function performIgnoreAction({
    dbPath,
    action,
    filePath,
    hostname,
}: PerformIgnoreActionParams) {
    assert(action === 'add', `Unknown action: ${action}`)

    if (!isAbsolute(filePath)) {
        console.error('File path must be relative')
        return
    }
    hostname ??= Deno.hostname()
    const db = getDefaultDatabase(dbPath);

    switch (action) {
        case 'add': {
            addIgnorePath({
                db,
                hostname,
                filePath,
            })
            return
        }
        default: { const _: never = action }
    }
}
