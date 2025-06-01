import { TreeMapNode, TrimmedTreeMapNode } from './showTree.ts'
import { FileEntry } from "../db/getDescendants.ts";
import { assertSnapshot } from "jsr:@std/testing/snapshot";
import { assertEquals } from "@std/assert/equals";

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

Deno.test(function testPathToTree_trimDepthTrims() {
    const test = pathsToTree([
        { hostname: 'host1', path: 'path1\\path2', size: 100 },
        { hostname: 'host1', path: 'path1\\path3\\path4\\child', size: 200 },
    ], 1)
    const expected = [{
        name: 'host1\\path1 - trimmed 2 leaves',
        size: 300,
        trimmedLeaves: 2,
    }]
    assertEquals(test, expected)
})
Deno.test(function testPathToTree_trimDepthRecursiveKeepsLess() {
    const test = pathsToTree([
        { hostname: 'host1', path: 'path1\\path2', size: 100 },
        { hostname: 'host1', path: 'path1\\path3\\path4\\child', size: 200 },
        { hostname: 'host1', path: 'path1\\path3\\path5\\child2', size: 300 },
    ], 2)
    const expected = [{
        name: 'host1\\path1',
        children: [
            { name: 'path2', size: 100 },
            { name: 'path3 - trimmed 2 leaves', size: 500, trimmedLeaves: 2 },
        ],
    }]
    assertEquals(test, expected)
})

type BuildNode = {
    name: string
    separator: string
    size?: number
    children?: BuildNode[]
}
export function pathsToTree(entries: FileEntry[], depth: number = 0) {
    function addChild(children: BuildNode[]) {
        return function (node: BuildNode) {
            children.push(node)
            return node
        }
    }
    const nodes: BuildNode[] = []
    for (const { hostname, path, size } of entries) {
        const { separator: separator, parts } = splitPath(path)

        let current = nodes.find((node) => node.name === hostname)
            ?? addChild(nodes)({
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
    const tree = buildNodeToTree(nodes)
    return trimTree(tree, depth)
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

function collectLeaves(node: TreeMapNode) {
    const result: [size: number, count: number] = [node.size ?? 0, node.size !== undefined ? 1 : 0]
    if ((node.children?.length ?? 0) === 0) {
        return result
    }
    const childLeaves = node.children?.map((child) => collectLeaves(child)) ?? []
    childLeaves.reduce((acc, [size, count]) => {
        acc[0] += size
        acc[1] += count
        return acc
    }, result)
    return result
}

function trimTree(tree: TreeMapNode[] | undefined, depth: number) {
    if (depth <= 0) {
        const trimmedTree: TrimmedTreeMapNode[] | undefined = tree
        return trimmedTree
    }
    if (depth === 1) {
        return tree?.map((node) => {
            if ((node.children?.length ?? 0) > 0) {
                const [leafSize, leafCount] = collectLeaves(node)
                const trimmed: TrimmedTreeMapNode = {
                    name: `${node.name} - trimmed ${leafCount} leaves`,
                    size: (node.size ?? 0) + leafSize,
                    trimmedLeaves: leafCount,
                }
                return trimmed
            }
            if (node.children?.length === 0) {
                const result: TrimmedTreeMapNode = {
                    name: node.name,
                    size: node.size,
                }
                return result
            }
            const result: TrimmedTreeMapNode = node
            return result
        })
    }
    const trimmed: TrimmedTreeMapNode[] | undefined = tree?.map((node): TrimmedTreeMapNode | undefined => {
        let trimmedChild: TrimmedTreeMapNode | undefined
        if (node.children === undefined) {
            trimmedChild = node
        } else {
            const trimmedChildren = trimTree(node.children, depth - 1)
            trimmedChild = node.size === undefined
                ? {
                    name: node.name,
                    children: trimmedChildren,
                }
                : {
                    name: node.name,
                    size: node.size,
                    children: trimmedChildren,
                }
        }
        return trimmedChild
    })
        .filter((v): v is TrimmedTreeMapNode => v !== undefined)
        .flatMap((v) => v)
    return trimmed
}
