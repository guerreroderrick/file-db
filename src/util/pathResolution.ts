import { path } from '../../deps.ts'
import { tryCatch } from './tryCatch.ts'

export type ResolvePathWithFallbackParams = {
    resolved: string
    fallbackAppPath: string
    logResult?: boolean
}
export async function resolvePathWithFallback({
    resolved,
    fallbackAppPath,
    logResult,
}: ResolvePathWithFallbackParams) {
    const result = await (async () => {
        const importMetaResolution = resolved
        const importMetaUrl = new URL(importMetaResolution)
        const tryStat = await tryCatch(async () =>
            await Deno.stat(importMetaUrl)
        )
        if (!tryStat.error) { return importMetaUrl }

        const execPath = Deno.execPath();
        const appDirectory = path.dirname(execPath)
        const resourceAppPath = path.join(appDirectory, fallbackAppPath)
        const resourceAppUrl = new URL(`file://${resourceAppPath}`)
        return resourceAppUrl
    })()

    const hashCommandPath = result.toString()
    const resultPath = await Promise.resolve(hashCommandPath.startsWith('file:///')
        ? hashCommandPath.slice('file:///'.length)
        : hashCommandPath)

    if (logResult) {
        console.warn({
            fallbackAppPath,
            result: result.toString(),
            resultPath,
        })
    }
    return resultPath
}