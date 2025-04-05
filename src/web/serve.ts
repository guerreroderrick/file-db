import { tryCatch } from '../util/tryCatch.ts'
import { contentType } from '../../deps.ts'

if (import.meta.main) {
    await main(Deno.args)
}

async function main(_args: string[]) {
    const server = Deno.serve({

    }, async (req, info) => {
        console.log({ req, info })

        let response = await handleStatic(req, info)
        if (response) { return response }

        response = handleIndexRedirect(req, info)
        if (response) { return response }

        return handleNotFound(req, info)
    })
    await server.finished
}

async function handleStatic(req: Request, _info: Deno.ServeHandlerInfo<Deno.NetAddr>) {
    if (req.method !== 'GET') { return null }

    const url = new URL(req.url)
    const pathname = url.pathname
    let filepath = pathname
    if (pathname === '/favicon.ico') {
        filepath = '/image/favicon.ico'
    }
    return await handleStaticPath(filepath)
}

async function handleStaticPath(filepath: string) {
    const allowedExtensions = /\.(html|ico|js)$/
    if (!allowedExtensions.test(filepath)) { return null }

    if (filepath.match(/\.\./)) {
        return new Response('Forbidden', { status: 403 })
    }
    const localPath = `./static/${filepath}`
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

function handleIndexRedirect(req: Request, _info: Deno.ServeHandlerInfo<Deno.NetAddr>): Response | null {

    if (!req.url.endsWith('/')) { return null }

    return new Response(null, {
        status: 302,
        headers: {
            location: req.url + 'index.html',
        },
    })
}
