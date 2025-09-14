import { isAbsolute } from '@std/path'
import { assert } from '@std/assert/assert'
import { getDefaultDatabase } from "../db/getDefaultDatabase.ts";
import { addIgnorePath, IgnoreType } from "../db/addIgnorePath.ts";

type PerformIgnoreActionParams = {
    dbPath: string
    action: string
    ignoreType: IgnoreType
    filePath: string
    hostname?: string
}
export function performIgnoreAction({
    dbPath,
    action,
    ignoreType,
    filePath,
    hostname,
}: PerformIgnoreActionParams) {
    assert(action === 'add', `Unknown action: ${action}`)

    if (ignoreType === 'prefix' && !isAbsolute(filePath)) {
        console.error('Prefix file path must be relative')
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
                ignoreType,
            })
            return
        }
        default: { const _: never = action }
    }
}
