
export type RunMainParams = {
    paramSet: 'error'
    error: string
    helpText: string
} | {
    paramSet: 'help'
    helpText: string
} | {
    paramSet: 'ignore action'
    action: 'add'
    filePath: string
} | {
    paramSet: 'sync'
    filePath: string
}

function getHelpTextForCommand(command: string): string | undefined {
    switch (command.toLowerCase()) {
        case 'ignore': return `
Usage: file-db ignore add <path>
Add a path to the ignore list. This will mark the path as ignored but not remove any existing entries.
`
        case 'sync': return `
Usage: file-db sync <path>
Sync the database with the file system. This will update the database to match the current state of the file system.
    sync <path>  Sync the database with the file system at the given path.
`
        default:
            return undefined
    }
}

export function parseArgs(args: readonly string[]): RunMainParams {
    const helpText = `
Usage: file-db <command> [options]
Commands:
  help, --help, -h  Show this help message and exit
  help <command>    Show help for a specific command
  normalize         Normalize paths in the database
  sync <path>       Sync the database with the file system
`

    const helpArgIndex = args.findIndex(arg => ['help', '--help', '-h'].includes(arg.toLowerCase()))
    if (helpArgIndex !== -1) {
        const helpArgs = args.toSpliced(helpArgIndex, 1)
        if (helpArgs.length === 0) {
            return { paramSet: 'help', helpText, }
        }
        if (helpArgs.length > 1) {
            return {
                paramSet: 'error',
                error: `Too many arguments for help command: ${helpArgs.join(' ')}`,
                helpText,
            }
        }
        const [command] = helpArgs
        const commandHelpText = getHelpTextForCommand(command)
        if (commandHelpText === undefined) {
            return {
                paramSet: 'error',
                error: `Unknown command for help: ${command}`,
                helpText,
            }
        }
        return {
            paramSet: 'help',
            helpText: commandHelpText,
        }
    }

    const command = args[0]?.toLowerCase()
    const commandArgs = args.slice(1)
    switch (command) {
        case 'ignore': {
            const [action, filePath] = commandArgs
            if (action !== 'add' || filePath === undefined || commandArgs.length > 2) {
                return {
                    paramSet: 'error',
                    error: `Invalid arguments for ignore: ${commandArgs.join(' ')}`,
                    helpText: getHelpTextForCommand('ignore')!,
                }
            }
            return {
                paramSet: 'ignore action',
                action,
                filePath,
            }
        }
    }

    const syncArgIndex = args.findIndex(arg => arg.toLowerCase() === 'sync')
    if (syncArgIndex !== -1) {
        const syncArgs = args.toSpliced(syncArgIndex, 1)
        if (syncArgs.length !== 1) {
            return {
                paramSet: 'error',
                error: `Invalid arguments for sync command: ${syncArgs.join(' ')}`,
                helpText,
            }
        }
        const [filePath] = syncArgs
        return {
            paramSet: 'sync',
            filePath,
        }
    }

    return {
        paramSet: 'error',
        error: `Unknown command: ${args.join(' ')}`,
        helpText,
    }
}
