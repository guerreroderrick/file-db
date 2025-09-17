type EventKind = Deno.FsEvent['kind']
type PathEventBuffer = Promise<string>
type ReducedEvent = {
    path: string
    kind: EventKind
}
export async function *reduceFileEvents(watcher: Deno.FsWatcher, debounceMilliseconds: number) {

    const paths = new Map<string, { timer: PathEventBuffer, kind: EventKind}>()
    const timers: PathEventBuffer[] = []

    const watchIterator = watcher[Symbol.asyncIterator]()

    let fsNext = await watchIterator.next()
    while (true) {
        if (fsNext.done) { break }

        const event = fsNext.value
        for (const path of event.paths) {
            if (paths.has(path)) {
                paths.get(path)!.kind = event.kind
            } else {
                const timer: PathEventBuffer = new Promise((resolve) => {
                    setTimeout(() => {
                        resolve(path)
                    }, debounceMilliseconds)
                })
                timers.push(timer)
                paths.set(path, {
                    timer,
                    kind: event.kind,
                })
            }
        }
        const fsNextProvider = watchIterator.next()
        let nextResult = await Promise.race([
            fsNextProvider,
            ...timers,
        ])
        for (
            ; typeof nextResult === 'string'
            ; nextResult = await Promise.race([
                fsNextProvider,
                ...timers,
            ])
        ) {
            const path = nextResult
            const removed = paths.get(path)!
            paths.delete(path)
            const removeIndex = timers.indexOf(removed.timer)
            timers.splice(removeIndex, 1)
            yield {
                path,
                kind: removed.kind,
            } as ReducedEvent
        }
        fsNext = nextResult
    }
    for (const entry of paths) {
        yield {
            path: entry[0],
            kind: entry[1].kind,
        }
    }
}
