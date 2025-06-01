import { format } from "../../deps.ts";
import { getDefaultDatabase } from "../db/getDefaultDatabase.ts";
import { tryCatch } from "../util/tryCatch.ts";

type CleanDatabaseParams = {
    dbPath: string
    dryRun: boolean
}

export async function cleanDatabase({
    dbPath,
    dryRun,
}: CleanDatabaseParams) {

    console.log(`Cleaning database at ${dbPath}... (dry run: ${dryRun})`)

    const db = getDefaultDatabase(dbPath)
    const result = await tryCatch(() => {
    db.transaction(() => {
        const numRows = db.query(`
select count(*) [count]
    from [files_Log]
    where isArchived = 1
`)
        console.log({
            numRows,
        })
        const query = `
delete
    from [files_Log]
    where rowid in (
        select rowid
            from [files_Log]
            where isArchived = 1
            order by hashTime desc, modifyTime desc, hostname, path, version, size
            limit 10000
        )
    returning hostname, path, version, size, hashTime, modifyTime, hash, ignoredFileId
`
        let rows = db.query<[hostname: string, path: string, version: bigint, size: number, hashtime: Date, modifyTime: Date, hash: string, ignoreFileId: number][]>(query)
        console.log('hostname,path,version,size,hashtime,modifyTime,hash,ignoreFileId'.split(',').join('\t'))
        while (rows.length > 0) {
            console.log(rows.map(r => r.join('\t')).join('\n'))
            rows = db.query(query)
        }
        if (dryRun) {
            throw new Error(`Dry run: cancel transaction`)
        }
    })})

    if (result.error && result.error.toString().includes('Dry run')) {
        console.log(`Dry run rolled back successfully`)
    } else if (result.error) {
        throw result.error
    }

    const vacuumPath = `${dbPath}.vacuum`
    const archiveTime = format(new Date(), 'yyyyMMdd-HHmmss')
    const archivePath = `${dbPath}.archive-${archiveTime}`
    if (dryRun) {
        console.log(`Dry run, would vacuum into ${vacuumPath} and then swap archive ${dbPath} to ${archivePath}`)
    } else {
        const checkExists = await tryCatch(() => Deno.stat(vacuumPath))
        if (!checkExists.error) {
            console.log(`Removing existing vacuum file at ${vacuumPath}`)
            await Deno.remove(vacuumPath)
        }
        console.log(`Database vacuum into ${vacuumPath}...`)
        db.execute(`vacuum main into '${vacuumPath}'`)
        db.close(true)
        console.log(`Database vacuum complete, swapping files...`)

        await Deno.rename(dbPath, archivePath)
        await Deno.rename(vacuumPath, dbPath)
        console.log(`Database swap complete, old database archived to ${archivePath}`)
    }
}
