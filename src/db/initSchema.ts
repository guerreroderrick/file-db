import { DB } from "../../deps.ts";

export function initTable_files_Log(db: DB) {
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
