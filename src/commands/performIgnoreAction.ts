import { isAbsolute } from 'jsr:@std/path@^1.0.8/is-absolute'
import { assert } from 'jsr:@std/assert/assert'
import { getDefaultDatabase } from "../db/getDefaultDatabase.ts";
import { addIgnorePath } from "../db/addIgnorePath.ts";

export function performIgnoreAction(action: string, filePath: string) {
    assert(action === 'add', `Unknown action: ${action}`)

    if (!isAbsolute(filePath)) {
        console.error('File path must be relative')
        return
    }
    const hostname = Deno.hostname()
    const db = getDefaultDatabase();

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
