
type MergeDbParams = {
    dbPath: string
    remoteDbPath: string
}
export function mergeDatabaseFile({
    dbPath,
    remoteDbPath,
}: MergeDbParams) {
    console.log({
        debug: `Merging database files`,
        dbPath,
        remoteDbPath,
    })
}
