import { DB } from "../../deps.ts";
import { addIgnorePath } from "./addIgnorePath.ts";
import { DBCheckedFile } from "./dbCheckedFile.ts";

type MergeDbParams = {
    from: DBCheckedFile
    to: DB
}
export function mergeDb({
    from: fromDb,
    to: toDb,
}: MergeDbParams) {

    console.log({
        debug: 'Attaching database',
        from: fromDb.filename,
    })
    toDb.execute(`
attach database '${fromDb.filename}' as [fromDb]
    `)

    const sync = () => {
        const [[srcVersion, destVersion]] = toDb.query<[number, number]>(`
select (select id from [fromDb].[version]) [srcVersion]
    , (select id from [version]) [destVersion]
        `)
        console.log({
            debug: 'Database versions',
            srcVersion,
            destVersion,
        })
        if (srcVersion !== destVersion) {
            throw new Error(`Database versions do not match: ${srcVersion} != ${destVersion}`)
        }

        console.log({
            debug: 'Creating staging tables',
        })
        toDb.execute(`
create temp table files_Staging as
    select
        src.hostname
        , src.path
        , src.size
        , src.modifyTime
        , src.hashTime
        , src.hash
        , coalesce(dest.version + 1, 0) [version]
        , false [isArchived]
        , iif(dest.hostname is null, 1, 0) isNew
        from [fromDb].[files_Log] src
        left join [files_Log] dest on src.hostname = dest.hostname
            and src.path = dest.path
            and dest.isArchived = 0
        where src.isArchived = 0
            and (dest.hostname is null
                or src.hashTime > dest.hashTime
                )
; create temp table pathErrors_Staging as
    select src.hostname, src.path, src.scanTime, src.error
        from [fromDb].[pathErrors_Log] src
        left join [pathErrors_Log] dest on src.hostname = dest.hostname
            and src.path = dest.path
            and src.scanTime = dest.scanTime
        where dest.hostname is null
; create temp table ignoredFiles_Staging as
    select src.hostname, src.path, src.addedAt
        from [fromDb].[ignoredFiles_Log] src
        left join [ignoredFiles_Log] dest on src.hostname = dest.hostname
            and src.path = dest.path
            and src.addedAt = dest.addedAt
        where dest.hostname is null
        `)

        console.log({
            debug: 'Archiving old versions of matched files',
        })
        toDb.execute(`
with archivedFiles as (
    select dest.rowid
        from files_Staging src
        join [files_Log] dest on src.hostname = dest.hostname
            and src.path = dest.path
            and dest.isArchived = false
            and src.isNew = false
)
    update files_Log set isArchived = true
        where rowid in (select rowid from archivedFiles)
        `)

        console.log({
            debug: 'Inserting new files',
        })
        toDb.execute(`
; insert into files_Log (hostname, path, size, modifyTime, hashTime, hash, version, isArchived)
    select hostname, path, size, modifyTime, hashTime, hash, version, isArchived
        from files_Staging
        `)
        const fileLogChanges= toDb.changes

        console.log({
            debug: 'Inserting new path errors',
        })
        toDb.execute(`
insert into pathErrors_Log (hostname, path, scanTime, error)
    select hostname, path, scanTime, error
        from pathErrors_Staging
        `)
        const pathErrorsChanges = toDb.changes

        console.log({
            debug: 'Inserting new ignored files',
        })
        toDb.execute(`
insert into ignoredFiles_Log (hostname, path, addedAt)
    select hostname, path, addedAt
        from ignoredFiles_Staging
        `)
        const ignoredFilesChanges = toDb.changes

        let fileLogNewlyIgnored = 0
        const rows = toDb.query<[hostname: string, path: string]>(`
select hostname, path
    from ignoredFiles_Staging
`)
        console.log({
            debug: 'Readding staged ignore paths',
            count: rows.length,
        })
        for (const [hostname, path] of rows) {
            const { numIgnored } = addIgnorePath({
                db: toDb,
                hostname,
                filePath: path,
                ignoreType: 'prefix',
            })
            fileLogNewlyIgnored += numIgnored
        }

        console.log({
            debug: 'Cleanup staging tables',
        })
        toDb.execute(`
drop table if exists files_Staging
; drop table if exists pathErrors_Staging
; drop table if exists ignoredFiles_Staging
        `)

        return {
            fileLogChanges,
            pathErrorsChanges,
            ignoredFilesChanges,
            fileLogNewlyIgnored,
        }
    }

    const {
        fileLogChanges,
        pathErrorsChanges,
        ignoredFilesChanges,
        fileLogNewlyIgnored,
    } = toDb.transaction(() => sync())
    toDb.execute(`
detach database [fromDb]
    `)

    return {
        fileLogChanges,
        pathErrorsChanges,
        ignoredFilesChanges,
        fileLogNewlyIgnored,
    }
}
