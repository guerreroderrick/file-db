package main

import (
	"bufio"
	"crypto/md5"
	"crypto/sha1"
	"crypto/sha256"
	"crypto/sha512"
	"encoding/hex"
	"fmt"
	"hash"
	"io"
	"log"
	"math/rand"
	"os"
	"path/filepath"
	"time"

	"github.com/cespare/xxhash/v2"
	"github.com/cxmcc/tiger"
	"github.com/zeebo/xxh3"
	"golang.org/x/crypto/blake2b"
	"golang.org/x/crypto/blake2s"
)

func main() {
	args := os.Args[1:]
	if len(args) < 1 {
		usageAndDie()
	}
	command := args[0]
	switch command {
	case "hash-files":
		runHashFiles(args[1:])
	case "time-hashes":
		runTimeHashes(args[1:])
	default:
		usageAndDie()
	}
}

const includeIgnoredHashes = "--include-ignore-hashes"

func runTimeHashes(args []string) {
	argLen := len(args)
	if argLen < 1 || argLen > 2 {
		usageAndDie()
	}
	if argLen == 2 && args[1] != includeIgnoredHashes {
		usageAndDie()
	}
	dir := args[0]
	isIncludeIgnoredHashes := argLen == 2

	start := time.Now()
	files := listFiles(dir)
	log.Printf("List files: %v found %d files\n", time.Since(start), len(files))

	fmt.Printf("Permuting files...")
	for i := range files {
		j := rand.Intn(i + 1)
		files[i], files[j] = files[j], files[i]
	}
	fmt.Println(" done.")

	start = time.Now()
	hashFiles2(files, func() hash.Hash { return sha256.New() }, true)
	log.Printf("Hash files(c) sha256: %v\n", time.Since(start))

	start = time.Now()
	hashFiles2(files, func() hash.Hash { return xxh3.New() }, true)
	log.Printf("Hash files(c) xxh3: %v\n", time.Since(start))

	start = time.Now()
	hashFiles2(files, func() hash.Hash { return xxhash.New() }, true)
	log.Printf("Hash files(c) xxh64: %v\n", time.Since(start))

	if isIncludeIgnoredHashes {
		start = time.Now()
		hashFiles(files, func() hash.Hash { return md5.New() })
		log.Printf("Hash files md5: %v\n", time.Since(start))

		start = time.Now()
		hashFiles(files, func() hash.Hash { return sha1.New() })
		log.Printf("Hash files sha1: %v\n", time.Since(start))

		start = time.Now()
		hashFiles(files, func() hash.Hash { return sha512.New() })
		log.Printf("Hash files sha512: %v\n", time.Since(start))

		start = time.Now()
		hashFiles(files, func() hash.Hash {
			hasher, err := blake2b.New256(nil)
			if err != nil {
				log.Panicln(err)
			}
			return hasher
		})
		log.Printf("Hash files blake2b: %v\n", time.Since(start))

		start = time.Now()
		hashFiles(files, func() hash.Hash {
			hasher, err := blake2s.New256(nil)
			if err != nil {
				log.Panicln(err)
			}
			return hasher
		})
		log.Printf("Hash files blake2s: %v\n", time.Since(start))

		start = time.Now()
		hashFiles(files, func() hash.Hash { return tiger.New() })
		log.Printf("Hash files tiger: %v\n", time.Since(start))
	}

	log.Println("Done")
}

func runHashFiles(args []string) {
	if len(args) == 0 {
		usageAndDie()
	}

	action := func(file string) {
		hash, err := getFileHash(file, func() hash.Hash { return sha256.New() })
		if err != nil {
			fmt.Printf("Error: %s\t%s\n", err, file)
		} else {
			fmt.Printf("%s\t%s\n", hash, file)
		}
	}
	if (len(args) == 1) && (args[0] == "-") {
		scanner := bufio.NewScanner(os.Stdin)
		for scanner.Scan() {
			file := scanner.Text()
			if (file == "") || (file[0] == '#') {
				continue
			}
			action(file)
		}
	} else {
		for _, file := range args {
			action(file)
		}
	}
}

func usageAndDie() {
	fmt.Println(`Usage: file-db-go command [options]
    Commands:
    - time-hashes: Show has times of files under <dir>.
        Args option 1: <dir> - the root directory of files to hash.
        Args option 2: [--include-ignore-hashes]
    - hash-files: Show SHA-256 hash and filename.
        Args option 1: Pass files to be hashed.
            file-db-go hash-files file1 file2 file3 ...
        Args option 2: Pass files to be hashed via stdin.
            file-db-go hash-files -`)
	os.Exit(1)
}

func listFiles(dir string) []string {
	files := make([]string, 0)
	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			log.Panicln(err)
		}
		if !info.IsDir() {
			_ = info.ModTime().Unix()
			_ = info.Size()
			files = append(files, path)
		}
		return nil
	})
	if err != nil {
		log.Panicln(err)
	}
	return files
}

func hashFiles(
	files []string,
	hashFactory func() hash.Hash,
) {
	hashFiles2(files, hashFactory, false)
}

func hashFiles2(
	files []string,
	hashFactory func() hash.Hash,
	checkCollisions bool,
) {
	lastCheckIn := time.Now()
	startTime := lastCheckIn
	counts := make(map[string]int)
	i := 0
	for _, file := range files {
		i++
		hash, err := getFileHash(file, hashFactory)
		if nil != err {
			log.Panicln(err)
		}
		if checkCollisions {
			counts[hash]++
		}
		now := time.Now()
		diff := now.Sub(lastCheckIn)
		if diff.Milliseconds() > 1000 {
			totalTime := now.Sub(startTime)
			percent := float64(i) / float64(len(files))
			estimate := time.Duration(totalTime.Seconds() / percent * float64(time.Second))
			fmt.Printf("%s of ~%s: %d files %.2f%%\r", totalTime.String(), estimate.String(), i, percent*100.0)
			lastCheckIn = now
		}
	}
	if lastCheckIn != startTime {
		log.Printf("\n")
	}
	if checkCollisions {
		mapSize := len(counts)
		log.Printf("%d unique hashes\n", mapSize)
	}
}

func getFileHash(filePath string, hashFactory func() hash.Hash) (string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	hasher := hashFactory()
	_, err = io.Copy(hasher, file)
	if err != nil {
		return "", err
	}

	hashBytes := hasher.Sum(nil)
	hash := hex.EncodeToString(hashBytes)
	return hash, nil
}
