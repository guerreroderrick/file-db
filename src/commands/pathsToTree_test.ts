import { TreeMapNode } from './showTree.ts'
import { FileEntry } from "../db/getDescendants.ts";
import { assertSnapshot } from "jsr:@std/testing/snapshot";

Deno.test(async function testPathToTree_emptyPathsIsEmpty(snaps) {
    const root = pathsToTree([])
    await assertSnapshot(snaps, root)
})

Deno.test(async function testPathToTree_singlePath(snaps) {
    const test = pathsToTree([
        { hostname: 'host1', path: 'path1', size: 100 },
    ])
    await assertSnapshot(snaps, test)
})

Deno.test(async function testPathToTree_toPathsDifferentHosts(snaps) {
    const test = pathsToTree([
        { hostname: 'host1', path: 'path1', size: 100 },
        { hostname: 'host2', path: 'path1', size: 200 },
    ])
    await assertSnapshot(snaps, test)
})

Deno.test(async function testPathToTree_differentPathsSameHost(snaps) {
    const test = pathsToTree([
        { hostname: 'host1', path: 'path1', size: 100 },
        { hostname: 'host1', path: 'path2', size: 200 },
    ])
    await assertSnapshot(snaps, test)
})

Deno.test(async function testPathToTree_sameChildren(snaps) {
    const test = pathsToTree([
        { hostname: 'host1', path: 'path1\\path2\\child1', size: 100 },
        { hostname: 'host1', path: 'path1\\path2\\child2', size: 200 },
    ])
    await assertSnapshot(snaps, test)
})
Deno.test(async function testPathToTree_differentDescendant(snaps) {
    const test = pathsToTree([
        { hostname: 'host1', path: 'path1\\path2', size: 100 },
        { hostname: 'host1', path: 'path1\\path3\\path4\\child', size: 200 },
    ])
    await assertSnapshot(snaps, test)
})

Deno.test(async function testPathToTree_pathHasSize(snaps) {
    const test= pathsToTree([
        { hostname: 'host1', path: 'path1\\path2', size: 100 },
        { hostname: 'host1', path: 'path1\\path2\\path3\\child', size: 200 },
    ])
    await assertSnapshot(snaps, test)
})

type BuildNode = {
    name: string
    separator: string
    size?: number
    children?: BuildNode[]
}
function pathsToTree(entries: FileEntry[]) {
    function addChild(children: BuildNode[]) {
        return function (node: BuildNode) {
            children.push(node)
            return node
        }
    }
    const tree: BuildNode[] = []
    for (const { hostname, path, size } of entries) {
        const { separator: separator, parts } = splitPath(path)

        let current = tree.find((node) => node.name === hostname)
            ?? addChild(tree)({
                name: hostname,
                separator: separator,
            })
        const lastIndex = parts.length - 1
        for (const [segment, i] of parts.map((v, i) => [v, i] as const)) {
            if (current.children === undefined) {
                current.children = []
            }
            const partRoot = current.children?.find((node) => node.name === segment)
                ?? addChild(current.children!)({
                    name: segment,
                    separator: separator,
                })
            if (i === lastIndex) {
                partRoot.size = size
            }
            current = partRoot
        }
    }
    return buildNodeToTree(tree)
}

function splitPath(path: string) {
    if (path.includes('/')) {
        return { separator: '/', parts: path.split('/') }
    }
    return { separator: '\\', parts: path.split('\\') }
}

function buildNodeToTree(tree?: BuildNode[], prefix?: string): TreeMapNode[] | undefined {
    if (tree?.length === 1) {
        const node = tree[0]
        const joinPrefix = prefix ? `${prefix}${node.separator}` : ''
        const joinNode = `${joinPrefix}${node.name}`
        if (node.size === undefined) {
            return buildNodeToTree(node.children, joinNode)
        } else {
            return [{
                name: joinNode,
                size: node.size,
                children: buildNodeToTree(node.children),
            }]
        }
    }
    const result: TreeMapNode[] | undefined = tree?.map((node) => ({
        name: `${node.name}`,
        size: node.size,
        children: buildNodeToTree(node.children),
    }))
    if (prefix !== undefined) {
        return [{
            name: prefix,
            children: result,
        }]
    }
    return result ?? []
}
