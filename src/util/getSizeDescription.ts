
export type Suffix = '' | 'K' | 'M' | 'G' | 'T'
const compare: [suffix: Suffix, multiplier: number][] = [
    ['', 1024],
    ['K', 1024 * 1024],
    ['M', 1024 * 1024 * 1024],
    ['G', 1024 * 1024 * 1024 * 1024],
    ['T', 1024 * 1024 * 1024 * 1024 * 1024],
] as const

export function getSizeDescription(size: number) {
    const { size: fixedSize, suffix } = getFixedSizeDescription(size)
    if (!fixedSize.includes('.')) {
        return { size: fixedSize, suffix }
    }
    if (fixedSize[fixedSize.length - 1] !== '0') {
        return { size: fixedSize, suffix }
    }
    if (fixedSize[fixedSize.length - 2] !== '0') {
        return { size: fixedSize.slice(0, -1), suffix }
    }
    if (fixedSize[fixedSize.length - 3] !== '0') {
        return { size: fixedSize.slice(0, -2), suffix }
    }
    return { size: fixedSize.slice(0, -4), suffix }
}

function getFixedSizeDescription(size: number) {
    if (size < compare[0][1]) {
        return { size: size.toString(), suffix: '' }
    }
    for (let i = 1; i < compare.length; i++) {
        const [suffix, multiplier] = compare[i]
        if (size < multiplier) {
            const prevMultiplier = compare[i - 1][1]
            return { size: (size / prevMultiplier).toFixed(3), suffix }
        }
    }
    const [suffix] = compare[compare.length - 1]
    const [,prevMultiplier] = compare[compare.length - 1]
    return { size: (size / prevMultiplier).toFixed(3), suffix }
}