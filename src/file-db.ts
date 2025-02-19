import { assert } from "@std/assert/assert";
import { performRegularCleanup } from "./registerProcessCleanup.ts";
import { listFilesSync } from "./listFiles.ts";

if (import.meta.main) {
    await main(Deno.args)
}

async function main(args: string[]) {
    try {
        await syncFileDb(args)
    } finally {
        performRegularCleanup()
    }
}

function syncFileDb(args: string[]) {
    if (args.length !== 1) {
        assert(false, `Usage: file-db <file-path>`)
    }

    const [filePath] = args

    const files = listFilesSync(filePath)
    const hostname = Deno.hostname()
    console.log({ hostname, fileCount: files.length })
}
