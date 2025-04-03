
export async function tryCatch<Result>(fn: () => Promise<Result>): Promise<
    { result: Result }
    | { error: unknown }
> {
    try {
        return { result: await fn() }
    } catch (error) {
        return { error }
    }
}
