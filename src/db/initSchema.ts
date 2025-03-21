import { DB } from "../../deps.ts";

export type DBVersion = {
    id: bigint
    description: string
    updatedAt: Date
}

const currentVersion: DBVersion = {
    id: 2n,
    description: 'Add pathErrors_Log table',
    updatedAt: new Date('2025-03-20'),
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
    , modifyTime datetime not null
    , hash bytea null
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
