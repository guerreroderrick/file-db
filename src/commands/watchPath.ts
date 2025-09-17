import { getDefaultDatabase } from "../db/getDefaultDatabase.ts";
import { addScanEntry } from "../db/scanEntry.ts";
import { getCurrentPathCase } from "../path/getCurrentPathCase.ts";
import { reduceFileEvents } from "../path/reduceFileEvents.ts";
import { registerProcessCleanup } from "../registerProcessCleanup.ts";

type WatchPathParams = {
    dbPath: string
    filePath: string
}
export async function watchPath({
    dbPath,
    filePath
}: WatchPathParams) {
    const db = getDefaultDatabase(dbPath)
    const hostname = Deno.hostname()

    const currentCaseFilePath = await getCurrentPathCase(filePath)
    if (currentCaseFilePath !== filePath) {
        console.log({ debug: `Path case changed '${currentCaseFilePath}'` })
    }
    // loop until ctrl-c
    const entry = addScanEntry({
        db,
        hostname,
        path: currentCaseFilePath,
    })
    console.log({
        debug: `watch ${currentCaseFilePath}`,
        entry,
    })
    using watcher = Deno.watchFs(currentCaseFilePath, {
        recursive: true,
    })
    registerProcessCleanup(() => {
        watcher.close()
    })
    const reduced = reduceFileEvents(watcher, 200)
    for await (const event of reduced) {
        console.log({ debug: 'fs event', event })
    }
}
