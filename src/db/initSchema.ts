import { DB } from "../../deps.ts";

export type DBVersion = {
    id: bigint
    description: string
    updatedAt: Date
}

const currentVersion: DBVersion = {
    id: 5n,
    description: 'Add files_Log.ignoredFileId column',
    updatedAt: new Date('2025-04-06'),
}

export function initSchema(db: DB) {
    initTable_version(db)

    const versionRow = db.query<[id: bigint, description: string, updatedAt: Date]>(`
select id, description, updatedAt
    from [version]
    order by id desc
    limit 1
        `)
    if (versionRow.length === 0) {
        versionRow.push([0n, 'Empty database', new Date()])
    }
    const [id, description, updatedAt] = versionRow[0]
    const { id: currentId } = currentVersion
    if (id.toString() === currentId.toString()) { return }

    const version = { id, description, updatedAt }
    migrateDatabase(db, version)
}

function initTable_version(db: DB) {
    db.execute(`
create table if not exists [version] (
    id integer primary key
    , description text not null
    , updatedAt datetime not null
    )
        `)
}

function initTable_files_Log(db: DB) {
    db.execute(`
create table if not exists [files_Log] (
    hostname text not null
    , path text not null
    , size integer not null
    , modifyTime datetime not null
    , hash bytea null
    , version bigint not null
    , isArchived bit not null default 0
    )
`)
}

function initTable_files_Log_v2(db: DB) {
    db.execute(`
create table if not exists [files_Log] (
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
        `)
}

function initTable_pathErrors_Log(db: DB) {
    db.execute(`
create table if not exists [pathErrors_Log] (
    hostname text not null
    , path text not null
    , scanTime datetime not null
    , error text not null
    , primary key (hostname, path, scanTime)
    )
        `)
}

function initTable_ignoredFiles_Log(db: DB) {
    db.execute(`
create table if not exists [ignoredFiles_Log] (
    id integer primary key autoincrement
    , hostname text not null
    , path text not null
    , addedAt datetime not null
    , unique (hostname, path)
    )
`)
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
/* Version: 0. Empty database. Add version table. */
    create table if not exists [version] (
        id integer primary key
        , description text not null
        , updatedAt datetime not null
        )

/* Version: 1. Initial version. */
    insert into [version] (id, description, updatedAt)
        values (0, 'Empty database', 0)
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
    ; insert into [version] (id, description, appliedAt, '-- not saved, requires manual injection')
        select id, description, updatedAt
            from [version_migrate]
    ; drop table [version_migrate]
`
}

function migrateDatabase(db: DB, sourceVersion: DBVersion) {
    const { id, description, } = currentVersion
    const { id: sourceId, description: sourceDescription, updatedAt: sourceUpdatedAt } = sourceVersion
    console.log({
        debug: `Migrating database from version ${sourceId} (${sourceDescription}) to version ${id} (${description})`,
        sourceUpdatedAt,
    })
db.transaction(() => {
    switch (`${sourceId}`) {
        case '0':
            db.execute(`
insert into [version] (id, description, updatedAt)
    values (0, 'Empty database', 0)
`)
            initTable_files_Log(db)
            /* falls through */
        case '1':
            initTable_pathErrors_Log(db)
            /* falls through */
        case '2':
            db.query(`
alter table [files_Log] rename to [files_Log_migrate]
            `)
            initTable_files_Log_v2(db)
            db.execute(`
insert into [files_Log] (hostname, path, version, isArchived, size, hashTime, modifyTime, hash)
    select hostname, path, version, isArchived, size, null, modifyTime, hash
        from [files_Log_migrate]
; drop table [files_Log_migrate]
`)
            /* falls through */
        case '3':
            initTable_ignoredFiles_Log(db)
            /* falls through */
        case '4':
            db.query(`
alter table [files_Log] rename to [files_Log_migrate]
            `)
            initTable_files_Log_v2(db)
            db.execute(`
insert into [files_Log] (hostname, path, version, isArchived, size, hashTime, modifyTime, hash)
    select hostname, path, version, isArchived, size, hashTime, modifyTime, hash
        from [files_Log_migrate]
; drop table [files_Log_migrate]
            `)

            db.query(`
update [version] set id = ?, description = ?, updatedAt = ?
                `, [id, description, new Date()])
            /* falls through */
        case `${currentVersion.id}`:
            break;
        default:
            throw new Error('Migration not implemented yet')
    }
})}
