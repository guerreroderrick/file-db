import { DB } from "../../deps.ts";

export function initSchema(db: DB) {
    const versions = getSQLSchemaVersions()
    applyVersion({ db, upToVersion: versions.length - 1, })
}

type ApplyVersionParams = {
    db: DB
    upToVersion: number
    debug?: boolean
    includeTestData?: boolean
}
export function applyVersion({
    db,
    upToVersion,
    debug = false,
    includeTestData = false,
}: ApplyVersionParams) {
    const versions = getSQLSchemaVersions()
    if (upToVersion < 0 || upToVersion >= versions.length) {
        throw new Error(`Invalid version: ${upToVersion}. Must be between 0 and ${versions.length - 1}`)
    }

    const dbVersion = getDbVersion(db)
    if ((dbVersion ?? -1) > upToVersion) { return }

    for (let i = (dbVersion ?? -1) + 1; i <= upToVersion; i++) {
        db.transaction(() => {
            const { description, script, testDataScript, } = versions[i]
            if (debug) {
                console.log(`Applying version ${i}: ${description}\n${script}`)
            }
            try {
                db.execute(script)
            } catch (e) {
                throw new Error(`Failed to apply version ${i}: ${description}\nCaused by: ${e}`)
            }
            if (includeTestData) {
                if (debug) {
                console.log(`Applying testData ${i}: ${testDataScript}`)
                }
                try {
                    db.execute(testDataScript)
                } catch (e) {
                    throw new Error(`Failed to apply testData ${i}: ${description}\nCaused by: ${e}`)
                }
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
    const versionList: {
        description: string,
        script: string,
        testDataScript: string,
    }[] = []
    let prevIndex = 0
    for (const version of versions) {
        const description = version[1].trim()

        updatePrevScript(versionList, schema, prevIndex, version.index)
        versionList.push({
            description,
            script: '',
            testDataScript: '',
        })
        prevIndex = version.index + version[0].length
    }
    updatePrevScript(versionList, schema, prevIndex)
    return versionList
}

function updatePrevScript(versionList: { description: string; script: string; testDataScript: string; }[], schema: string, prevIndex: number, end?: number) {
  if (versionList.length > 0) {
    const prevScript = schema.substring(prevIndex, end).trim();

    const findTestData = prevScript.match(/(?<script>.*)(-- *testData: +(?<comment>[^\r\n]*)\r?\n|\/\* *testData:(?<commentBlock>.*)\*\/)(?<testData>.*)/ims);
    if (findTestData === null) {
      versionList.at(-1)!.script = prevScript;
    } else {
      const { script, testData } = findTestData.groups!;
      versionList.at(-1)!.script = script.trim();
      versionList.at(-1)!.testDataScript = testData.trim();
    }
  }
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

    -- testData: files in two hosts
    insert into [files_Log] (hostname, path, size, modifyTime, hash, version, isArchived)
        values ('test-data-bad-host-1', '/path/to/file1.txt', 1234, '2023-01-01 12:00:00', x'1234567890abcdef', 1, 0)
    ; insert into [files_Log] (hostname, path, size, modifyTime, hash, version, isArchived)
        values ('host1', '/path/to/file1.txt', 1234, '2023-01-01 12:00:00', x'1234567890abcdef', 1, 0)
            , ('host2', '/path/to/file2.txt', 5678, '2023-01-02 12:00:00', x'abcdef1234567890', 1, 0)

/* Version: 2. Add path errors. */
    create table if not exists [pathErrors_Log] (
        hostname text not null
        , path text not null
        , scanTime datetime not null
        , error text not null
        , primary key (hostname, path, scanTime)
        )

    /* testData:
    Add some path errors.
    */
    insert into [files_Log] (hostname, path, size, modifyTime, hash, version, isArchived)
        values ('test-data-bad-host-2', '/path/to/file1.txt', 1234, '2023-01-01 12:00:00', x'1234567890abcdef', 1, 0)
    ; insert into [pathErrors_Log] (hostname, path, scanTime, error)
        values ('host1', '/path/to/file1.txt', '2023-01-01 12:00:00', 'File not found')
            , ('host2', '/path/to/file2.txt', '2023-01-02 12:00:00', 'Permission denied')

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

    -- testData: Add some ignored files.
    insert into [ignoredFiles_Log] (hostname, path, addedAt)
        values ('host1', '/ignore/path1', '2023-01-01 12:00:00')
            , ('host2', '/ignore/path2', '2023-01-02 12:00:00')
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

/* Version: 7. Add type to ignoredFiles_Log. */
    alter table [ignoredFiles_Log] rename to [ignoredFiles_Log_migrate]
    ; create table [ignoredFiles_Log] (
        id integer primary key autoincrement
        , ignoreType text not null
        , hostname text not null
        , path text not null
        , addedAt datetime not null
        , unique (ignoreType, hostname, path)
        )
    ; insert into [ignoredFiles_Log] (id, ignoreType, hostname, path, addedAt)
        select id, 'prefix', hostname, path, addedAt
            from [ignoredFiles_Log_migrate]
    ; drop table [ignoredFiles_Log_migrate]

    -- testData: add prefix and name filters
    insert into [ignoredFiles_Log] (ignoreType, hostname, path, addedAt)
        values ('prefix', 'host1', '/ignore/prefix1', '2023-01-01 12:00:00')
            , ('name', 'host2', 'name-filter', '2023-01-02 12:00:00')

    -- version 8 migrations should succeed with same host same path
    ; insert into pathErrors_Log (hostname, path, scanTime, error)
        values ('host1', '/same-path', '2023-01-01 12:00:00', 'Error 1')
            , ('host1', '/same-path', '2023-01-01 12:00:01', 'Error 1')

/* Version: 8. Add scanId for pathErrors_Log. */
    alter table [pathErrors_Log] rename to [pathErrors_Log_migrate]
    ; create table if not exists [pathErrors_Log] (
        hostname text not null
        , path text not null
        , scanId integer bigint not null
        , scanTime datetime not null
        , error text not null
        , primary key (hostname, path, scanId)
        )
    ; insert into [pathErrors_Log] (hostname, path, scanId, scanTime, error)
        select hostname, path
            , row_number() over (partition by hostname, path order by scanTime)
            , scanTime, error
            from [pathErrors_Log_migrate]
    ; drop table [pathErrors_Log_migrate]

    -- testData: Using valid scanIds
    insert into [pathErrors_Log] (hostname, path, scanId, scanTime, error)
        values ('host1', '/path/to/file1.txt', 1000, '2023-01-01 12:00:00', 'File not found')
            , ('host2', '/path/to/file2.txt', 1001, '2023-01-02 12:00:00', 'Permission denied')

/* Version: 9. Add scanEntry_Log table. */
    create table if not exists [scanEntry_Log] (
        hostname text not null
        , scanId bigint not null
        , path text not null
        , startTime datetime not null
        , scanEndTime datetime null
        , hashEndTime datetime null
        , unique (hostname, scanId, path)
        )

    -- testData: Add some scan entries.
    insert into [scanEntry_Log] (hostname, scanId, path, startTime, scanEndTime, hashEndTime)
        values ('host1', 1000, '/path/to/file1.txt', '2023-01-01 12:00:00', '2023-01-01 12:00:10', '2023-01-01 12:00:15')
            , ('host2', 1000, '/path/to/file2.txt', '2023-01-01 12:00:00', null, null)
`
}
