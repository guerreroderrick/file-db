import { path } from '../../deps.ts'
import { tryCatch } from './tryCatch.ts'

export function stripFilePrefix(fileUrl: URL) {
    const filePath = fileUrl.toString()
    return filePath.startsWith('file:///')
        ? filePath.slice('file:///'.length)
        : filePath
}

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

    if (logResult) {
        console.warn({
            fallbackAppPath,
            result: result.toString(),
        })
    }
    return result
}