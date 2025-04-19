
export function once<T>(fn: () => T) {
    let set = false
    let result: T | undefined
    return () => {
        if (!set) {
            result = fn()
            set = true
        }
        return result!
    }
}

export function memo<T, U>(fn: (arg: U) => T) {
    const dict = new Map<U, T>()
    return (arg: U) => {
        if (!dict.has(arg)) {
            const result = fn(arg)
            dict.set(arg, result)
        }
        return dict.get(arg)!
    }
}