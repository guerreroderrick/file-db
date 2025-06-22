# Todo

- [-] Clean archived and vacuum
  - [-] Add scanId for pathErrors
    - [-] Allow test data in schema for migrations
  - [ ] Remove prior scanIds on clean per hostname and path
  - [ ] Add scanId for file log
  - [ ] Archive logs with prior scanIds per hostname and path
  - [ ] Show vacuum saved space and only swap if > 0
- [ ] Include directory hashes during scan
  - [-] Merge remote db should update ignores
  - [ ] Batch show-tree query so it can be cancelled for large scans
  - [ ] Missing descendents during scan should be marked as archived
- [-] Decide paths to ignore
  - [x] List immediate children below graph
- [ ] Only log new path errors

# Done

- [x] 2025-06-21 Allow ignoring folder name in any path
- [x] 2025-05-27 refactor db migrations
- [x] 2025-04-27 allow separate db path, merge dbs
- [x] 2025-04-09 Ignore paths
- [x] 2025-04-06 Ensure root path matches current case
- [x] Scan paths