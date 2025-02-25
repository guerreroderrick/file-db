
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
