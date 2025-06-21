# Todo

- [ ] Include directory hashes during scan
  - [-] Merge remote db should update ignores
  - [ ] Batch show-tree query so it can be cancelled for large scans
  - [ ] Missing descendents during scan should be marked as archived
- [-] Clean archived and vacuum
  - [ ] Show vacuum saved space and only swap if > 0
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