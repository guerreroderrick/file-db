import { DB } from "../../deps.ts";

export function initSchema(db: DB) {
    const versions = getSQLSchemaVersions()
    applyVersion(db, versions.length - 1)
}

export function applyVersion(db: DB, upToVersion: number, debug?: boolean) {
    const versions = getSQLSchemaVersions()
    if (upToVersion < 0 || upToVersion >= versions.length) {
        throw new Error(`Invalid version: ${upToVersion}. Must be between 0 and ${versions.length - 1}`)
    }

    const dbVersion = getDbVersion(db)
    if ((dbVersion ?? -1) > upToVersion) { return }

    for (let i = (dbVersion ?? -1) + 1; i <= upToVersion; i++) {
        db.transaction(() => {
            const { description, script } = versions[i]
            if (debug) {
                console.log(`Applying version ${i}: ${description}\n${script}`)
            }
            try {
                db.execute(script)
            } catch (e) {
                throw new Error(`Failed to apply version ${i}: ${description}\nCaused by: ${e}`)
            }

            if (i < 6) {
                db.query(`insert into [version] (id, description, updatedAt) values (?, ?, ?)`, [i, versions[i].description, new Date(), ])
            } else if (i === 6) {
                for (let j = 0; j < 6; j++) {
                    const { script } = versions[j]
                    db.query(`update [version] set script = ? where id = ?`, [script, j])
                }
                db.query(`insert into [version] (id, description, appliedAt, script) values (?, ?, ?, ?)`, [
                    i, versions[i].description, new Date(), versions[i].script,
                ])
            } else {
                db.query(`insert into [version] (id, description, appliedAt, script) values (?, ?, ?, ?)`, [
                    i, versions[i].description, new Date(), versions[i].script,
                ])
            }
        })
    }
}

function getDbVersion(db: DB, debug?: boolean) {
    try {
        const versionRow = db.query<[id: number]>(`
select max(id) from [version]
        `)
        const [id] = versionRow[0]
        return id
    } catch (e) {
        if (debug) {
            console.debug({
                debug: 'Failed to get database version',
                exception: e,
            })
        }
    }
    return undefined
}

export function getSQLSchemaVersions() {
    const schema = getSQLSchema()
    const versions = schema.matchAll(/\/\* Version:(.*)\*\//ig)
    const versionList: { description: string, script: string }[] = []
    let prevIndex = 0
    for (const version of versions) {
        const description = version[1].trim()

        if (versionList.length > 0) {
            const prevScript = schema.substring(prevIndex, version.index).trim()
            versionList.at(-1)!.script = prevScript
        }
        versionList.push({
            description,
            script: '',
        })
        prevIndex = version.index + version[0].length
    }
    if (versionList.length > 0) {
        const lastScript = schema.substring(prevIndex)
        versionList.at(-1)!.script = lastScript
    }
    return versionList
}

function getSQLSchema() {
    return `
/* Version: 0. Empty database. Add version table. Superceded in 6. */
    create table if not exists [version] (
        id integer primary key
        , description text not null
        , updatedAt datetime not null
        )

/* Version: 1. Initial version. */
    ; create table if not exists [files_Log] (
        hostname text not null
        , path text not null
        , size integer not null
        , modifyTime datetime not null
        , hash bytea null
        , version bigint not null
        , isArchived bit not null default 0
        )

/* Version: 2. Add path errors. */
    create table if not exists [pathErrors_Log] (
        hostname text not null
        , path text not null
        , scanTime datetime not null
        , error text not null
        , primary key (hostname, path, scanTime)
        )

/* Version: 3. Add ignored fileId to files_Log. */
    alter table [files_Log] rename to [files_Log_migrate]
    ; create table if not exists [files_Log] (
        hostname text not null
        , path text not null
        , version bigint not null
        , isArchived bit not null default 0
        , size integer not null
        , hashTime datetime null
        , modifyTime datetime not null
        , hash bytea null
        , ignoredFileId integer null
        , primary key (hostname, path, version)
        )
    ; insert into [files_Log] (hostname, path, version, isArchived, size, hashTime, modifyTime, hash)
        select hostname, path, version, isArchived, size, null, modifyTime, hash
            from [files_Log_migrate]
    ; drop table [files_Log_migrate]

/* Version: 4. Add ignoredFiles_Log table. */
    create table if not exists [ignoredFiles_Log] (
        id integer primary key autoincrement
        , hostname text not null
        , path text not null
        , addedAt datetime not null
        , unique (hostname, path)
        )

/* Version: 5. Removed unnecessary migration. */ -- Removed

/* Version: 6. Rename version.updatedAt to appliedAt. */
    alter table [version] rename to [version_migrate]
    ; create table if not exists [version] (
        id integer primary key
        , description text not null
        , appliedAt datetime not null
        , script text not null
        )
    ; insert into [version] (id, description, appliedAt, script)
        select id, description, updatedAt, '-- not saved, requires manual injection'
            from [version_migrate]
    ; drop table [version_migrate]
`
}
