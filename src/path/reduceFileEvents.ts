type EventKind = Deno.FsEvent['kind']
const TimerSignal = 'expired' as const
type TimerSignal = typeof TimerSignal
type ReducedEvent = {
    path: string
    kind: EventKind
}
export async function *reduceFileEvents(watcher: Deno.FsWatcher, debounceMilliseconds: number) {

    const paths = new Map<string, { timer: number, kind: EventKind}>()

    const watchIterator = watcher[Symbol.asyncIterator]()

    const expired: string[] = []
    let expire: ((signal: TimerSignal) => void) | undefined

    async function tryWait() {
        if (expired.length > 0) { return TimerSignal }
        return await new Promise<TimerSignal>(resolve => expire = resolve)
    }
    function advance(path: string) { 
        expired.push(path)
        if (expire) {
            expire(TimerSignal)
            expire = undefined
        }
    }

    for (let fsNext = await watchIterator.next()
        ; !fsNext.done
        ;
    ) {
        const event = fsNext.value
        for (const path of event.paths) {
            const existing = paths.get(path)
            if (existing) {
                existing.kind = event.kind
            } else {
                const timer = setTimeout(() => {
                    advance(path)
                }, debounceMilliseconds)
                paths.set(path, {
                    timer,
                    kind: event.kind,
                })
            }
        }
        const fsNextProvider = watchIterator.next()
        let bufferNextProvider = tryWait()
        let nextResult = await Promise.race([
            fsNextProvider,
            bufferNextProvider,
        ])
        for (
            ; nextResult === 'expired'
            ; bufferNextProvider = tryWait()
            , nextResult = await Promise.race([
                fsNextProvider,
                bufferNextProvider,
            ])
        ) {
            const ready = expired
                .map(path => ({
                    path,
                    kind: paths.get(path)!.kind,
                } as ReducedEvent))
            expired.length = 0
            for (const event of ready) {
                paths.delete(event.path)
                yield event
            }
        }
        fsNext = nextResult
    }
    for (const [path, {timer, kind}] of paths) {
        yield {
            path,
            kind,
        } as ReducedEvent
        clearTimeout(timer)
    }
}
