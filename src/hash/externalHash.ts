import { assert } from 'jsr:@std/assert/assert'

const externalHashCommand = ((p: string) => {
    return p.startsWith('file:///')
        ? p.slice('file:///'.length)
        : p
})(import.meta.resolve('../../go/file-db-go.exe'))

export type ExternalHashParams = {
    fileList: string[]
    forceStdin?: boolean
}
export async function externalHash({
    fileList,
    forceStdin = false,
}: ExternalHashParams) {
    const useStdIn = forceStdin || fileList.length > 8

    const launch = useStdIn
        ? async () => {
            const cmd = new Deno.Command(externalHashCommand, {
                args: ['hash-files', '-'],
                stdin: 'piped',
                stdout: 'piped',
            })
            const child = cmd.spawn()
            assert(child.stdin !== null)
            const writer = child.stdin.getWriter()
            await writer.write(new TextEncoder().encode(fileList.join('\n')))
            await writer.close()
            return child
        } : () => {
            const cmd = new Deno.Command(externalHashCommand, {
                args: ['hash-files', ...fileList],
                stdin: 'piped',
                stdout: 'piped',
            })
            const child = cmd.spawn()
            return child
        }
    
    const child = await launch()
    const results = await Promise.all([
        child.status,
        readLines(child.stdout),
    ])
    assert(results[1].length === fileList.length, `Expected ${fileList.length} results, got ${results[1].length}`)
    const [status, hashes] = results
    assert(status.success, `External process failed with status: ${status.code}`)
    return hashes
}

async function readLines(stdout: ReadableStream<Uint8Array>) {
    const results: [hash: string, file: string][] = []
    const decoder = new TextDecoder()
    const reader = stdout.getReader()
    while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const buffer = decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        for (const line of lines.filter((line) => line.length > 0)) {
            const [hash, file] = line.split('\t')
            results.push([hash, file])
        }
    }
    return results
}
