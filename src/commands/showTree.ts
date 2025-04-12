import { open } from "../../deps.ts";
import { getDescendants } from "../db/getDescendants.ts";

type ShowTreeParams = {
    depth: number
    hostname: { isAnyHost: true } | { isAnyHost: false; host: string; }
    path: { isAnyPath: true } | { isAnyPath: false; prefix: string; }
    keepAlive: boolean
}
export async function showTree(args: ShowTreeParams) {
    console.log({
        debug: 'showTree',
        args,
    })
    const { keepAlive } = args

    const data=  await queryData(args)
    const fullData = fillTreeMapData(data)
    const html = await renderTreeMap(fullData)
    await serveHtml({
        html,
        keepAlive,
    })
}

type TreeMapNode = {
    name: string
    size?: number
    children?: TreeMapNode[]
}
async function queryData({
    depth,
    hostname,
    path,
}: ShowTreeParams) {
    const descendants = getDescendants({
        depth,
        hostname,
        path,
    })
    console.log({ descendants })
    
    await Promise.resolve()
    const root: TreeMapNode = {
        name: 'root',
        children: [
            {
                name: 'child1',
                size: 100,
            },
            {
                name: 'child2',
                size: 200,
            },
            {
                name: 'child3',
                children: [
                    {
                        name: 'child3.1',
                        size: 10,
                    },
                    {
                        name: 'child3.2',
                        size: 20,
                    },
                ],
            },
        ],
    }
    return root
}

type FullTreeMapNode = {
    name: string
    value?: number
    children: FullTreeMapNode[]
    descendantCount: number
}

const replacementSearch = '<!-- TreeMap data placeholder -->'
async function renderTreeMap(data: FullTreeMapNode) {
    const templatePath = import.meta.resolve('./templates/show-tree-index.html-template')
    const templateUrl = new URL(templatePath)
    const template = await Deno.readTextFile(templateUrl)
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

function fillTreeMapData(data: TreeMapNode) {
    const children = data.children?.map(child => fillTreeMapData(child)) ?? []
    const descendantCount = children.length
        + children
            .reduce(
                (acc, child) =>
                    acc + child.descendantCount
                , 0
            )

    const filled: FullTreeMapNode = {
        ...data,
        value: data.size,
        children,
        descendantCount,
    }
    return filled
}
