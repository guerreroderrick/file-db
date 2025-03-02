# Lightning talk aside

This example compared file hash execution times with different methods.
The example showed during the presentation included the following commands:

```shell
deno task testHashes md5,sha-256 d:\p --include-external-test
```

```shell
go/file-db-go.exe time-hashes d:\p
```

# file-db project

My goal with this project is to better understand what duplicate files I have on separate systems and if important files are on more than one system.

Eventually, I would like to investigate [SnapRAID](https://github.com/amadvance/snapraid) and [mergerfs](https://github.com/trapexit/mergerfs) to redunandancy.
For now, I am exploring this as a learning opportunity for Deno and sqlite.