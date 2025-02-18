
const registrations: ((interrupted?: boolean) => void)[] = []
const hooksRegistered = [false]

export function registerProcessCleanup(callback: (interrupted?: boolean) => void) {
    if (!hooksRegistered[0]) {
        registerCleanupHooks()
        hooksRegistered[0] = true
    }
    registrations.push(callback)
}
export function performRegularCleanup() {
    performCleanup(false)
}

function registerCleanupHooks() {
    const handleSignal = (signal: Deno.Signal) =>
        () => {
            console.log(`Received signal: ${signal}`)
            performCleanup(true)
        }

    Deno.addSignalListener('SIGINT', handleSignal('SIGINT'))
    Deno.addSignalListener('SIGBREAK', handleSignal('SIGBREAK'))
    if (Deno.build.os !== 'windows') {
        Deno.addSignalListener('SIGTERM', handleSignal('SIGTERM'))
    }
}

function performCleanup(interrupted: boolean) {
    for (const callback of registrations) {
        try {
            callback(interrupted)
        } catch (error) {
            console.error(`Error during cleanup: ${error}`)
        }
    }
    if (interrupted) {
        console.log('Abnormal exit.')
        Deno.exit(1)
    }
}
