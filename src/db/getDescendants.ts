
type GetDescendantParams = {
    depth: number
    hostname: { isAnyHost: true } | { isAnyHost: false; host: string }
    path: { isAnyPath: true } | { isAnyPath: false; prefix: string }
}
export type FileEntry = {
    hostname: string
    path: string
    size: number
}
export function getDescendants({
}: GetDescendantParams) {

    const descendants: FileEntry[] = [
        {
            hostname: 'child1',
            path: 'path',
            size: 100,
        },
        {
            hostname: 'child2',
            path: 'path',
            size: 200,
        },
        {
            hostname: 'child3',
            path: '1',
            size: 10,
        },
        {
            hostname: 'child3',
            path: '2',
            size: 20,
        },
    ]
    return descendants
}