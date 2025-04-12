
export type RunMainParams = {
    paramSet: 'error'
    error: string
    helpText: string
} | {
    paramSet: 'help'
    helpText: string
} | IgnoreParameters
  | ShowTreeParameters
  | SyncParameters

function getHelpTextForCommand(command: string): string | undefined {
    switch (command.toLowerCase()) {
        case 'ignore': return getCommandHelp_Ignore()
        case 'show-tree': return getCommandHelp_ShowTree()
        case 'sync': return getCommandHelp_Sync()
        default:
            return undefined
    }
}

export function parseArgs(args: readonly string[]): RunMainParams {
    const helpText = getCommandHelp()
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
        case 'ignore': return parseCommand_Ignore(commandArgs)
        case 'show-tree': return parseCommand_ShowTree(commandArgs)
        case 'sync': return parseCommand_Sync(commandArgs)
    }

    return {
        paramSet: 'error',
        error: `Unknown command: ${args.join(' ')}`,
        helpText,
    }
}

function getCommandHelp() { return `
Usage: file-db <command> [options]
Commands:
  help, --help, -h  Show this help message and exit
  help <command>    Show help for a specific command
  normalize         Normalize paths in the database
  show-tree         Show a tree-map of the scanned files
  sync <path>       Sync the database with the file system
` }

function getCommandHelp_Ignore() { return `
Usage: file-db ignore add <path>
Add a path to the ignore list. This will mark the path as ignored but not remove any existing entries.
` }

type IgnoreParameters = {
    paramSet: 'ignore action'
    action: 'add'
    filePath: string
}
function parseCommand_Ignore(args: readonly string[]) {
    const [action, filePath] = args
    if (action !== 'add' || filePath === undefined || args.length > 2) {
        return {
            paramSet: 'error',
            error: `Invalid arguments for ignore: ${args.join(' ')}`,
            helpText: getHelpTextForCommand('ignore')!,
        } as const
    }
    const params: IgnoreParameters = {
        paramSet: 'ignore action',
        action,
        filePath,
    }
    return params
}

function getCommandHelp_ShowTree() { return `
Usage: file-db show-tree [--depth=5] [--hostname=<host>] [--path=<path-prefix>]
Show a tree-map of the scanned files.
    --depth=<depth>      The depth of the tree to show. Default is 5.
    --hostname=<host>    Show only files on the given host. If not specified, show all hosts.
    --path=<path-prefix> Show only files with the given path prefix.
` }

type ShowTreeParameters = {
    paramSet: 'show-tree'
    depth: number
    hostname: {
        isAnyHost: true
    } | {
        isAnyHost: false
        host: string
    }
    path: {
        isAnyPath: true
    } | {
        isAnyPath: false
        prefix: string
    }
}
function parseCommand_ShowTree(_args: readonly string[]) {
    const params: ShowTreeParameters = {
        paramSet: 'show-tree',
        depth: 5,
        hostname: { isAnyHost: true },
        path: { isAnyPath: true },
    }
    return params
}

function getCommandHelp_Sync() { return `
Usage: file-db sync <path>
Sync the database with the file system. This will update the database to match the current state of the file system.
    sync <path>  Sync the database with the file system at the given path.
` }

type SyncParameters = {
    paramSet: 'sync'
    filePath: string
}
function parseCommand_Sync(args: readonly string[]) {
    const [filePath] = args
    if (filePath === undefined || args.length > 1) {
        return {
            paramSet: 'error',
            error: `Invalid arguments for sync command: ${args.join(' ')}`,
            helpText: getHelpTextForCommand('sync')!,
        } as const
    }
    const params: SyncParameters = {
        paramSet: 'sync',
        filePath,
    }
    return params
}
