import { assert } from 'jsr:@std/assert/assert'

export type RunMainParams = {
    paramSet: 'sync'
    filePath: string
} | {
    paramSet: 'normalize'
}

export function parseArgs(args: string[]): RunMainParams {
    const usage = () => {
        assert(false, `Usage: file-db [options] <file-path>`)
    }
    const normalizeIndex = args.findIndex(arg => arg.toLowerCase() === '--normalize')
    if (normalizeIndex !== -1) {
        args.splice(normalizeIndex, 1)
        return { paramSet: 'normalize' }
    }
    if (args.length !== 1) {
        usage()
    }

    const [filePath] = args
    return { paramSet: 'sync', filePath, }
}
