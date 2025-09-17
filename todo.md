# Todo
- [-] Watch path and report patches to possibly deconflict
  - [x] Refactor arguments
  - [-] Watch path until Ctrl+c
    - [ ] Report matching hashes
    - [ ] Save new paths for adds
    - [ ] Update paths for moves
    - [ ] Remove paths for deletes
    - [ ] Directory junctions and hard links aren't notified, can we inspect for them?
- [ ] Add copy with Verify
  - [ ] Add xxHash3-64 for quick non-conflict hash
  - [ ] Copy and auto-update
- [:] Clean archived and vacuum
  - [x] Add scanId for pathErrors
  - [x] Record scan entries to know which are previous
    - [x] Ensure last version doesn't add test data
  - [ ] Add scanId for file log
  - [ ] Archive logs with prior scanIds per hostname and path
  - [ ] Remove prior scanIds on clean per hostname and path
  - [ ] Show vacuum saved space and only swap if > 0
- [ ] Include directory hashes during scan
  - [:] Merge remote db should update ignores
  - [ ] Batch show-tree query so it can be cancelled for large scans
  - [ ] Missing descendents during scan should be marked as archived
- [:] Decide paths to ignore
  - [x] List immediate children below graph
- [ ] Only log new path errors

# Done

- [x] 2025-06-21 Allow ignoring folder name in any path
- [x] 2025-05-27 refactor db migrations
- [x] 2025-04-27 allow separate db path, merge dbs
- [x] 2025-04-09 Ignore paths
- [x] 2025-04-06 Ensure root path matches current case
- [x] Scan paths
