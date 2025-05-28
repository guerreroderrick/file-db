
type CleanDatabaseParams = {
    dbPath: string
    dryRun: boolean
}

export function cleanDatabase({
    dbPath,
    dryRun,
}: CleanDatabaseParams) {
    console.log(`Cleaning database at ${dbPath}... (dry run: ${dryRun})`);
}
