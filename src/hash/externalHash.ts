import { assert } from 'jsr:@std/assert/assert'

const externalHashCommand = ((p: string) => {
    return p.startsWith('file:///')
        ? p.slice('file:///'.length)
        : p
})(import.meta.resolve('../../go/file-db-go.exe'))

export type ExternalHashParams = {
    fileList: string[]
    commandPath?: string
    forceStdin?: boolean
}

async function* consumeLines(stdout: ReadableStream<Uint8Array>) {
    const decoder = new TextDecoder()
    const reader = stdout.getReader()
    let remainder: string = ''
    while (true) {
        const { value, done } = await reader.read()
        if (done) {
            if (remainder.length > 0) {
                yield remainder
            }
            break
        }

        const buffer = decoder.decode(value, { stream: true })
        const text = remainder + buffer
        const lines = text.split('\n')
        remainder = lines.pop() ?? ''
        for (const line of lines.filter((line) => line.length > 0)) {
            yield line
        }
    }
    reader.releaseLock()
}

type HashWithKeepAliveParams = {
    fileList: string[]
    commandPath: string
}

export class ExternalHasher {
    private proxy: null | {
        child: Deno.ChildProcess
        writer: WritableStreamDefaultWriter<Uint8Array>
        reader: ReturnType<typeof consumeLines>
    }

    constructor(args: { commandPath?
        : string}) {

        let commandPath = args?.commandPath
        commandPath ??= externalHashCommand
        const cmd = new Deno.Command(commandPath, {
            args: ['hash-files', '-'],
            stdin: 'piped',
            stdout: 'piped',
        })
        const child = cmd.spawn()
        assert(child.stdin !== null)
        const writer = child.stdin.getWriter()
        const reader = consumeLines(child.stdout)
        this.proxy = { child, writer, reader, }
    }

    async hashFiles(fileList: string[]) {
        assert(this.proxy !== null)
        const { writer, reader } = this.proxy
        writer.write(new TextEncoder().encode(fileList.join('\n') + '\n'))

        const results: [hash: string, file: string][] = new Array<[string, string]>(fileList.length)
        for (let i = 0; i < fileList.length; i++) {
            const next = await reader.next()
            assert(!next.done)
            const value = next.value
            results[i] = value.split('\t') as [string, string]
        }
        return results
    }

    async [Symbol.asyncDispose]() {
        assert(this.proxy !== null)
        const { child, writer, reader, } = this.proxy
        this.proxy = null
        await writer.close()
        await child.status
        let next = await reader.next()
        while (!next.done) {
            console.log({next})
            next = await reader.next()
        }
        child.stdout.cancel()
    }
}
