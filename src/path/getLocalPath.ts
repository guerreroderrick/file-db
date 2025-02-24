
export function getLocalPath(importMeta: ImportMeta, path: string) {
    return (importMeta.dirname ?? '.') + path
}
