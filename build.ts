
if (import.meta.main) {
    await main()
}

async function main() {
    const start = Date.now()
    await runOrThrow('deno', ['check', '.'])
    await runOrThrow('deno', ['lint', '.'])
    await runOrThrow('go', ['build'], {
        cwd: './go',
    })
    await runOrThrow('deno', ['task', 'test-once'])
    console.log(`Complete all tasks after ${Date.now() - start}ms`)
}

type RunOrThrowOptions = {
    cwd?: string
}
async function runOrThrow(command: string, args?: string[], options?: RunOrThrowOptions) {
    const start = Date.now()
    const cmd = new Deno.Command(command, {
        cwd: options?.cwd,
        args,
        stdout: 'inherit',
        stderr: 'inherit',
    })
    const child = cmd.spawn()
    const [status] = await Promise.all([child.status])
    if (!status.success) {
        console.log(`${options?.cwd ?? './'} ${command} ${args?.join(' ')}: ${status.code} after ${Date.now() - start}ms`)
        throw new Error(`Command ${command} failed with code ${status.code}`)
    }
    console.log(`${command} ${args?.join(' ')}: success after ${Date.now() - start}ms`)
}