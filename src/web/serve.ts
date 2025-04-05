import { tryCatch } from '../util/tryCatch.ts'
import { contentType } from '../../deps.ts'

if (import.meta.main) {
    await main(Deno.args)
}

async function main(_args: string[]) {
    const server = Deno.serve({

    }, async (req, info) => {
        console.log({ req, info })

        const response = await handleStatic(req, info)
        if (response) { return response }

        return handleNotFound(req, info)
    })
    await server.finished
}

async function handleStatic(req: Request, info: Deno.ServeHandlerInfo<Deno.NetAddr>) {
    if (req.method !== 'GET') { return null }

    const url = new URL(req.url)
    const pathname = url.pathname
    let filepath = pathname
    if (pathname === '/favicon.ico') {
        filepath = '/static/image/favicon.ico'
    }
    return await handleStaticPath(filepath)
}

async function handleStaticPath(filepath: string) {
    if (!filepath.startsWith('/static/')) { return null }

    if (filepath.match(/\.\./)) {
        return new Response('Forbidden', { status: 403 })
    }
    const localPath = `.${filepath}`
    const ext = localPath.split('.').pop()!
    const tryStat = await tryCatch(() => Deno.stat(localPath))
    if (tryStat.error) {
        return new Response(`Not found: ${filepath}`, { status: 404 })
    }
    const fileInfo = tryStat.value
    if (!fileInfo.isFile) { return new Response('Not a file', { status: 404 }) }

    const file = await Deno.open(localPath, { read: true, })
    const stream = file.readable
    const contentMimeType = contentType(ext)
    const mimeType = contentMimeType ?? 'application/octet-stream'
    console.log({ localPath, mimeType })
    const response = new Response(stream, {
        status: 200,
        headers: {
            'content-type': mimeType,
            'content-length': fileInfo.size.toString(),
        },
    })
    return response
}

function handleNotFound(_req: Request, _info: Deno.ServeHandlerInfo<Deno.NetAddr>): Response | PromiseLike<Response> {
    return new Response("Not found", {
        status: 404,
        headers: { "content-type": "text/plain" },
    })
}
