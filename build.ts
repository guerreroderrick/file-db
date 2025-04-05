
if (import.meta.main) {
    await main()
}

async function main() {
    await runOrThrow('deno', ['check', '.'])
    await runOrThrow('deno', ['lint', '.'])
    await runOrThrow('deno', ['task', 'test-once'])
}

async function runOrThrow(command: string, args?: string[]) {
    const cmd = new Deno.Command(command, {
        args,
        stdout: 'inherit',
        stderr: 'inherit',
    })
    const child = cmd.spawn()
    const [status] = await Promise.all([child.status])
    if (!status.success) {
        throw new Error(`Command ${command} failed with code ${status.code}`)
    }
}