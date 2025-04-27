import { DBCheckedFile } from "../db/dbCheckedFile.ts";
import { getDefaultDatabase } from "../db/getDefaultDatabase.ts";
import { mergeDb } from "../db/mergeDb.ts";
import * as path from 'jsr:@std/path'

type MergeDbParams = {
    dbPath: string
    remoteDbPath: string
}
export function mergeDatabaseFile({
    dbPath,
    remoteDbPath,
}: MergeDbParams) {
    if (!path.isAbsolute(remoteDbPath)) {
        remoteDbPath = path.join(Deno.cwd(), remoteDbPath)
    }
    const mergeResults = mergeDb({
        from: new DBCheckedFile(remoteDbPath),
        to: getDefaultDatabase(dbPath),
    })
    console.log({
        debug: `Merging database files`,
        dbPath,
        remoteDbPath,
        mergeResults,
    })
}
