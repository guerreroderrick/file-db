import { assertEquals } from "@std/assert/equals";
import { DB } from "../../deps.ts";

type addScanEntryParams = {
    db: DB
    hostname: string
    path: string
}
export function addScanEntry({
    db,
    hostname,
    path,
}: addScanEntryParams) {

    const startTime = new Date()
    const scanId = startTime.getTime()

    db.query(`
insert into [scanEntry_Log] (hostname, scanId, path, startTime, scanEndTime, hashEndTime)
    values (?, ?, ?, ?, null, null)
`, [hostname, scanId, path, startTime])

    return scanId
}

type updateScanEntryEndTimeParams = {
    db: DB
    hostname: string
    path: string
    scanId: number
}
export function updateScanEntryEndTime({
    db,
    hostname,
    path,
    scanId,
}: updateScanEntryEndTimeParams) {
    const endTime = new Date()
    db.query(`
update [scanEntry_Log] set scanEndTime = ?
    where hostname = ?
        and scanId = ?
        and path = ?
        and scanEndTime is null
`, [endTime, hostname, scanId, path])

    assertEquals(db.changes, 1)
}
export function updateScanEntryHashEndTime({
    db,
    hostname,
    path,
    scanId,
}: updateScanEntryEndTimeParams) {
    const endTime = new Date()
    db.query(`
update [scanEntry_Log] set hashEndTime = ?
    where hostname = ?
        and scanId = ?
        and path = ?
        and hashEndTime is null
`, [endTime, hostname, scanId, path])

    assertEquals(db.changes, 1)
}
