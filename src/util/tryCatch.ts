
type Value<T> = { value: T, error: false }
type ErrorResult = { error: Error }
type Result<T> = Value<T> | ErrorResult

export async function tryCatch<T>(fn: () => Promise<T> | T): Promise<Result<T>>
{
    try {
        return { value: await fn(), error: false }
    } catch (error) {
        if (error instanceof Error) { return { error } }
        return {
            error: new Error(`Unknown error: ${error}`
                , { cause: error }
            )
        }
    }
}
