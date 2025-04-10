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
        initEmptyDatabase(db)
        return
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

function initEmptyDatabase(db: DB) {
    const { id, description, updatedAt } = currentVersion
    db.query(`
insert into [version] (id, description, updatedAt)
    values (?, ?, ?)
        `, [id, description, updatedAt])

    initTable_files_Log(db)
    initTable_pathErrors_Log(db)
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
        case '1':
            initTable_pathErrors_Log(db)
            /* falls through */
        case '2':
            db.query(`
alter table [files_Log] rename to [files_Log_migrate]
            `)
            initTable_files_Log(db)
            db.query(`
insert into [files_Log] (hostname, path, version, isArchived, size, hashTime, modifyTime, hash)
    select hostname, path, version, isArchived, size, null, modifyTime, hash
        from [files_Log_migrate]
            `)
            db.query(`
drop table [files_Log_migrate]
            `)
            /* falls through */
        case '3':
            initTable_ignoredFiles_Log(db)
            /* falls through */
        case '4':
            db.query(`
alter table [files_Log] rename to [files_Log_migrate]
            `)
            initTable_files_Log(db)
            db.query(`
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
