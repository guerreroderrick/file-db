import * as esbuild from 'npm:esbuild'
import { denoPlugins } from 'jsr:@luca/esbuild-deno-loader'

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
    await esbuild.build({
        plugins: [...denoPlugins()],
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
        ...'--allow-read --allow-write --allow-net --allow-run --allow-sys ./file-db.js'.split(' '),
    ], {
        cwd: './dist',
    })
    await runOrThrow('./file-db.exe', ['--help'], {
        cwd: './dist',
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