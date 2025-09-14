import { PrimaryCountOption } from '../commands/showTree.ts'
import { IgnoreType } from "../db/addIgnorePath.ts";

export type RunMainParams = {
    paramSet: 'error'
    error: string
    helpText: string
} | {
    paramSet: 'help'
    helpText: string
} | (GlobalOptions
    & (CleanParameters
        | IgnoreParameters
        | MergeParameters
        | ShowTreeParameters
        | SyncParameters
    )
)

type GlobalOptions = {
    dbPath: string
}

function getHelpTextForCommand(command: string): string | undefined {
    switch (command.toLowerCase()) {
        case 'clean': return getCommandHelp_Clean()
        case 'ignore': return getCommandHelp_Ignore()
        case 'merge': return getCommandHelp_Merge()
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
        if (command === '--global-options') {
            return {
                paramSet: 'help',
                helpText: getGlobalOptionsHelp(),
            }
        }

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

    function parseGlobalOptions(args: readonly string[]) {
        const globalOptions: GlobalOptions = {
            dbPath: 'file-db.sqlite3',
        }
        const commandArgs: string[] = [...args]
        for (let i = 0; i < args.length; i++) {
            const arg = args[i]
            if (arg.startsWith('--db=')) {
                const dbPath = arg.slice('--db='.length)
                if (dbPath === '') {
                    return {
                        error: `Invalid database path: ${arg}`,
                    } as const
                }
                globalOptions.dbPath = dbPath
                commandArgs.splice(i, 1)
            }
        }
        const command = args[0]?.toLowerCase()
        commandArgs.splice(0, 1)
        return {
            globalOptions,
            command,
            commandArgs,
        }
    }
    const {
        error,
        globalOptions,
        command,
        commandArgs,
    } = parseGlobalOptions(args)
    if (error) {
        return {
            paramSet: 'error',
            error,
            helpText,
        } as const
    }

    function addGlobalOptions<T>(params: T): T & GlobalOptions {
        return {
            ...params,
            ...globalOptions,
        } as T & GlobalOptions
    }
    switch (command) {
        case 'clean':
            return addGlobalOptions(parseCommand_Clean(commandArgs))
        case 'ignore':
            return addGlobalOptions(parseCommand_Ignore(commandArgs))
        case 'merge':
            return addGlobalOptions(parseCommand_Merge(commandArgs))
        case 'show-tree':
            return addGlobalOptions(parseCommand_ShowTree(commandArgs))
        case 'sync':
            return addGlobalOptions(parseCommand_Sync(commandArgs))
    }

    return {
        paramSet: 'error',
        error: `Unknown command: ${args.join(' ')}`,
        helpText,
    }
}

function getCommandHelp() { return `
Usage: file-db [global-options] <command> [options]
Commands:
  help, --help, -h       Show this help message and exit
  help <command>         Show help for a specific command
  help --global-options  Show help for global options
  ignore <parameters ..> Add or remove ignored paths
  merge <remote-db>      Merge a remote database
  show-tree              Show a tree-map of the scanned files
  sync <path>            Sync the database with the file system
` }

function getGlobalOptionsHelp() { return `
Usage: file-db [global-options] <command> [options]
Global Options:
  --db=<path>  Path to the database file. The default is
                   file-db.sqlite3 in the current directory.
` }

function getCommandHelp_Clean() { return `
Usage: file-db clean [--dry-run]
Remove archive entries and vacuum the database.
    --dry-run  Log the archived entries but do not remove them.
               This option does not vacuum.
` }

type CleanParameters = {
    paramSet: 'clean'
    dryRun: boolean
}

function parseCommand_Clean(args: readonly string[]) {
    if (args.length > 1) {
        return {
            paramSet: 'error',
            error: `Invalid arguments for clean command: ${args.join(' ')}`,
            helpText: getHelpTextForCommand('clean')!,
        } as const
    }
    const dryRun = args.includes('--dry-run')
    if (args.length > 0 && !args.includes('--dry-run')) {
        return {
            paramSet: 'error',
            error: `Invalid argument for clean command: ${args.join(' ')}`,
            helpText: getHelpTextForCommand('clean')!,
        } as const
    }
    const params: CleanParameters = {
        paramSet: 'clean',
        dryRun,
    }
    return params
}

function getCommandHelp_Ignore() { return `
Usage: file-db ignore add <path> --hostname=<hostname>
Add a path to the ignore list. This will mark the path as ignored but not remove any existing entries.
    --hostname=<hostname>  The hostname to use for the ignore entry. If not specified, the current hostname will be used.
    --prefix               The path is a prefix. This will ignore all files that start with the given path.
    --name                 The path is a name. This will ignore all files with the given name.
` }

type IgnoreParameters = {
    paramSet: 'ignore action'
    action: 'add'
    ignoreType: IgnoreType
    filePath: string
    hostname?: string
}
function parseCommand_Ignore(args: readonly string[]) {
    const [action, filePath, hostnamePart] = args
    const hostnameError = hostnamePart !== undefined && !hostnamePart.startsWith('--hostname=')
    if (action !== 'add' || filePath === undefined || hostnameError) {
        return {
            paramSet: 'error',
            error: `Invalid arguments for ignore: ${args.join(' ')}`,
            helpText: getHelpTextForCommand('ignore')!,
        } as const
    }

    let ignoreType: IgnoreType = 'prefix'
    let ignoreTypeSet = false
    for (const remainingArg of args.slice(3)) {
        if (remainingArg === '--prefix') {
            if (ignoreTypeSet) {
                return {
                    paramSet: 'error',
                    error: `Duplicate ignore type argument: ${remainingArg}`,
                    helpText: getHelpTextForCommand('ignore')!,
                } as const
            }
            ignoreType = 'prefix'
            ignoreTypeSet = true
        } else if (remainingArg === '--name') {
            if (ignoreTypeSet) {
                return {
                    paramSet: 'error',
                    error: `Duplicate ignore type argument: ${remainingArg}`,
                    helpText: getHelpTextForCommand('ignore')!,
                } as const
            }
            ignoreType = 'name'
            ignoreTypeSet = true
        } else {
            return {
                paramSet: 'error',
                error: `Invalid argument for ignore command: ${remainingArg}`,
                helpText: getHelpTextForCommand('ignore')!,
            } as const
        }
    }

    const hostname = hostnamePart?.slice('--hostname='.length)
    const params: IgnoreParameters = {
        paramSet: 'ignore action',
        action,
        ignoreType,
        filePath,
        hostname,
    }
    return params
}

function getCommandHelp_Merge() { return `
Usage: file-db merge <remote-db-path>
Merge the database file with the local database. Conflicting files
    will reserve the latest information, trusting the timestamps
    within the database.
` }

type MergeParameters = {
    paramSet: 'merge'
    remoteDbPath: string
}

function parseCommand_Merge(args: readonly string[]) {
    const [remoteDbPath] = args
    if (remoteDbPath === undefined || args.length > 1) {
        return {
            paramSet: 'error',
            error: `Invalid arguments for merge command: ${args.join(' ')}`,
            helpText: getHelpTextForCommand('merge')!,
        } as const
    }
    const params: MergeParameters = {
        paramSet: 'merge',
        remoteDbPath,
    }
    return params
}

function getCommandHelp_ShowTree() { return `
Usage: file-db show-tree [--depth=5] [--hostname=<host>] [--path=<path-prefix>]
Show a tree-map of the scanned files.
    --depth=<depth>      The depth of the tree to show. Default is 5.
                         0 will show all files.
    --hostname=<host>    Show only files on the given host. If not specified, show all hosts.
    --path=<path-prefix> Show only files with the given path prefix.
    --keep-alive         Keep the server alive after showing the tree.
    --primary-count=size|descendants
                         Base the tree size on the contained size or on the number of descendants.
` }

type ShowTree_HostParameter = {
    isAnyHost: true
} | {
    isAnyHost: false
    host: string
}
type ShowTree_PathParameter = {
    isAnyPath: true
} | {
    isAnyPath: false
    prefix: string
}
type ShowTreeParameters = {
    paramSet: 'show-tree'
    depth: number
    hostname: ShowTree_HostParameter
    path: ShowTree_PathParameter
    keepAlive: boolean
    primaryCount: PrimaryCountOption
}
function parseCommand_ShowTree(args: readonly string[]) {

    let depth = 5
    let hostname: ShowTree_HostParameter = { isAnyHost: true }
    let path: ShowTree_PathParameter = { isAnyPath: true }
    let keepAlive = false
    let primaryCount: PrimaryCountOption = 'size'
    let isDepthSet = false
    let isHostnameSet = false
    let isPathSet = false
    let isPrimaryCountSet = false

    function error(message: string) {
        return {
            paramSet: 'error',
            error: message,
            helpText: getHelpTextForCommand('show-tree')!,
        } as const
    }
    for (const arg of args) {
        if (arg.startsWith('--depth=')) {
            if (isDepthSet) {
                return error(`Duplicate depth argument: ${arg}`)
            }
            isDepthSet = true

            const depthArg = arg.slice('--depth='.length)
            depth = parseInt(depthArg, 10)
            if (isNaN(depth) || depth < 0) {
                return error(`Invalid depth argument: ${depthArg}`)
            }
        } else if (arg.startsWith('--hostname=')) {
            if (isHostnameSet) {
                return error(`Duplicate hostname argument: ${arg}`)
            }
            isHostnameSet = true

            const host = arg.slice('--hostname='.length)
            if (host === '') {
                return error(`Invalid hostname argument: ${arg}`)
            }
            hostname = { isAnyHost: false, host }
        } else if (arg.startsWith('--path=')) {
            if (isPathSet) {
                return error(`Duplicate path argument: ${arg}`)
            }
            isPathSet = true

            const pathPrefix = arg.slice('--path='.length)
            if (pathPrefix === '') {
                return error(`Invalid path argument: ${arg}`)
            }
            path = { isAnyPath: false, prefix: pathPrefix }
        } else if (arg === '--keep-alive') {
            keepAlive = true
        } else if (arg.startsWith('--primary-count=')) {
            if (isPrimaryCountSet) {
                return error(`Duplicate primary count argument: ${arg}`)
            }
            isPrimaryCountSet = true

            const primaryCountArg = arg.slice('--primary-count='.length)
            if (primaryCountArg === 'size' || primaryCountArg === 'descendants') {
                primaryCount = primaryCountArg
            } else {
                return error(`Invalid primary count argument: ${arg}`)
            }
        } else {
            return error(`Invalid argument for show-tree command: ${arg}`)
        }
    }
    const params: ShowTreeParameters = {
        paramSet: 'show-tree',
        depth,
        hostname,
        path,
        keepAlive,
        primaryCount,
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
