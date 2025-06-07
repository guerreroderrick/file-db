import { open } from "../../deps.ts";
import { getDefaultDatabase } from "../db/getDefaultDatabase.ts";
import { getDescendants } from "../db/getDescendants.ts";
import { pathsToTree } from "./pathsToTree_test.ts";
import { resolvePathWithFallback } from '../util/pathResolution.ts'

type ShowTreeParams = {
    dbPath: string
    depth: number
    hostname: { isAnyHost: true } | { isAnyHost: false; host: string; }
    path: { isAnyPath: true } | { isAnyPath: false; prefix: string; }
    keepAlive: boolean
    primaryCount: PrimaryCountOption
}
export async function showTree(args: ShowTreeParams) {
    console.log({
        debug: 'showTree',
        args,
    })
    const { keepAlive, primaryCount, } = args

    const data= queryData(args)
    const fullData = fillTreeMapData(data, primaryCount)
    const html = await renderTreeMap(fullData)
    await serveHtml({
        html,
        keepAlive,
    })
}

export type TreeMapNode = {
    name: string
    size?: number
    children?: TreeMapNode[]
}
export type TrimmedTreeMapNode = {
    name: string
    size?: number
    children?: TrimmedTreeMapNode[]
    trimmedLeaves?: number
}
function queryData({
    dbPath,
    depth,
    hostname,
    path,
}: ShowTreeParams) {
    const db = getDefaultDatabase(dbPath)
    const descendants = getDescendants({
        db,
        hostname,
        path,
    })
    const tree = pathsToTree(descendants, depth)
    if (tree?.length === 1) {
        return tree[0]
    }
    if (tree === undefined) {
        const empty: TrimmedTreeMapNode = { name: '<No results>' }
        return empty
    }
    const results: TrimmedTreeMapNode = {
        name: 'Results',
        children: tree,
    }
    return results
}

type FullTreeMapNode = {
    name: string
    value?: number
    descendantCount: number
    containedSize: number
    children: FullTreeMapNode[]
}

const replacementSearch = '<!-- TreeMap data placeholder -->'
async function renderTreeMap(data: FullTreeMapNode) {
    const relativeTemplate = './templates/show-tree-index.html-template'
    const resolvedTemplate = import.meta.resolve(relativeTemplate)
    const templatePath = await resolvePathWithFallback({
        resolved: resolvedTemplate,
        fallbackAppPath: relativeTemplate,
    })

    const template = await Deno.readTextFile(templatePath)
    const treeMapData = JSON.stringify(data)
    const html = template.replace(replacementSearch, treeMapData)
    return html
}

type ServeHtmlParams = {
    html: string
    keepAlive: boolean
}
async function serveHtml({
    html,
    keepAlive,
}: ServeHtmlParams) {
    const server = Deno.serve({
            port: 8000,
            hostname: 'localhost',
        }
        , (req, _info) => {
            const path = new URL(req.url).pathname
            console.log({
                method: req.method,
                url: req.url,
                path,
            })
            if (req.method === 'GET' && path === '/') {
                if (!keepAlive) { server.shutdown() }
                return new Response(html, {
                    status: 200,
                    headers: {
                        'content-type': 'text/html; charset=utf-8',
                    },
                })
            }
            return new Response('Not found', {
                status: 404,
                headers: {
                    'content-type': 'text/plain; charset=utf-8',
                },
            })
        }
    )
    console.log({
        addr: server.addr,
    })
    await open(`http://localhost:${server.addr.port}`)
    await server.finished
}

export type PrimaryCountOption = 'size' | 'descendants'
function fillTreeMapData(data: TrimmedTreeMapNode, option: PrimaryCountOption) {
    const children = data.children?.map(child => fillTreeMapData(child, option)) ?? []
    const descendantCount = children
        .reduce(
            (acc, child) =>
                acc + child.descendantCount
            , 0)
        + (data.children?.length ?? 0)
        + (data.trimmedLeaves ?? 0)
    const containedSize = children
        .reduce(
            (acc, child) =>
                acc + child.containedSize
            , 0
        )
        + (data.size ?? 0)

    const filled: FullTreeMapNode = {
        ...data,
        children,
        descendantCount,
        containedSize,
        ... (option === 'size'
            ? {
                value: data.size,
            }
            : {
                value: data.children?.length ?? 0,
            }
        )
    }
    return filled
}
