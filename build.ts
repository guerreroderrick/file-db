import * as esbuild from 'esbuild'
import { denoPlugins } from '@luca/esbuild-deno-loader'
import { JSZip } from './deps.ts'
import { path } from "./deps.ts"
import { getSizeDescription } from './src/util/getSizeDescription.ts'

if (import.meta.main) {
    await main()
}

async function main() {
    const start = Date.now()
    await runOrThrow('deno', ['check', '.'])
    await runOrThrow('deno', ['lint', '.'])
    await runOrThrow('go', ['build'], {
        cwd: './go',
    })
    await runOrThrow('deno', ['task', 'test-once'])
    const pluginsToAdd = denoPlugins()
    await esbuild.build({
        plugins: pluginsToAdd,
        entryPoints: ['./src/file-db.ts'],
        outfile: './dist/file-db.js',
        bundle: true,
        format: 'esm',
        treeShaking: true,
    })
    await esbuild.stop()
    await Deno.writeTextFile('./dist/deno.json', '{}')

    await Deno.mkdir('./dist/templates', { recursive: true })
    await Deno.copyFile('./src/commands/templates/show-tree-index.html-template', './dist/templates/show-tree-index.html-template')
    await runOrThrow('deno', ['compile',
        '--output', './',
        '--target', 'x86_64-pc-windows-msvc',
        ...'--allow-env --allow-read --allow-write --allow-net --allow-run --allow-sys ./file-db.js'.split(' '),
    ], {
        cwd: './dist',
    })
    await runOrThrow('./file-db.exe', ['--help'], {
        cwd: './dist',
    })
    await zipDist({
        zipPath: './dist/file-db.zip',
        zipSource: {
            fileEntries: [{ sourceFile: './dist/file-db.exe', },],
            folderEntries: [
                {
                    folderName: 'templates',
                    fileEntries: [{ sourceFile: './dist/templates/show-tree-index.html-template', },],
                },
                {
                    folderName: 'go',
                    fileEntries: [{ sourceFile: './go/file-db-go.exe', },],
                },
            ],
        },
    })
    console.log(`Complete all tasks after ${Date.now() - start}ms`)
}

type RunOrThrowOptions = {
    cwd?: string
}
async function runOrThrow(command: string, args?: string[], options?: RunOrThrowOptions) {
    const start = Date.now()
    const cmd = new Deno.Command(command, {
        cwd: options?.cwd,
        args,
        stdout: 'inherit',
        stderr: 'inherit',
    })
    const child = cmd.spawn()
    const [status] = await Promise.all([child.status])
    if (!status.success) {
        console.log(`${options?.cwd ?? './'} ${command} ${args?.join(' ')}: ${status.code} after ${Date.now() - start}ms`)
        throw new Error(`Command ${command} failed with code ${status.code}`)
    }
    console.log(`${command} ${args?.join(' ')}: success after ${Date.now() - start}ms`)
}

type ZipDistParams = {
    zipPath: string
    zipSource: ZipSource
}
type ZipSource = {
    fileEntries?: ZipFileSource[]
    folderEntries?: ZipFolderSource[]
}
type ZipFileSource = {
    sourceFile: string
    targetName?: string
}
type ZipFolderSource = {
    folderName: string
    fileEntries?: ZipFileSource[]
    folderEntries?: ZipFolderSource[]
}

function fileSizeDescription(size: number) {
    const { size: descr, suffix, } = getSizeDescription(size)
    return `${descr} ${suffix.toLowerCase()}b`
}
async function zipDist({
    zipPath,
    zipSource,
}: ZipDistParams) {

    const zip = new JSZip()
    await addZipEntries(zip, zipSource)
    await zip.writeZip(zipPath)
    const zipStat = await Deno.stat(zipPath)
    console.log({ 
        debug: 'generated zip',
        zipPath,
        size: fileSizeDescription(zipStat.size),
    })
}

async function addZipEntries(zip: JSZip, zipSource: ZipSource) {
    for (const fileEntry of (zipSource.fileEntries ?? [])) {
        const { sourceFile, targetName } = fileEntry
        const fileName = targetName ?? path.basename(sourceFile)
        const sourceContents = await Deno.readFile(sourceFile)
        zip.addFile(fileName, sourceContents)
        console.log({ 
            debug: 'add file',
            fileName,
            sourceFile,
            size: fileSizeDescription(sourceContents.byteLength),
        })
    }
    for (const folderEntry of (zipSource.folderEntries ?? [])) {
        const { folderName } = folderEntry
        const folder = zip.folder(folderName)
        if (!folder) {
            throw new Error(`Failed to create folder ${folderName}`)
        }
        console.log({ 
            debug: 'add folder',
            folderName,
        })
        await addZipEntries(folder, folderEntry)
    }
}
