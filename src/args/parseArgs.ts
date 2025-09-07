import { PrimaryCountOption } from '../commands/showTree.ts'
import { IgnoreType } from "../db/addIgnorePath.ts";
import { checkFlag, checkString, Command, CommandLine, ErrorSet, HelpSet } from "./commandLine.ts";

export const DEFAULT_DB_PATH = 'file-db.sqlite3'

export type RunMainParams = 
    ErrorSet
    | HelpSet
    | (GlobalOptions
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
        case 'sync': return getCommandHelp_Sync()
        default:
            return undefined
    }
}

export function parseArgs(args: readonly string[]): RunMainParams {
    const commandLine = new CommandLine([{
            key: 'db-path',
            example: '--db-path <filepath>',
            description: 'the path of the database',
            default: [DEFAULT_DB_PATH],
        }], globals => ({
            dbPath: checkString(globals['db-path'])!,
        }))
        .command(cleanCommand)
        .command(ignoreCommand)
        .command(mergeCommand)
        .command(showTreeCommand)
    const result = commandLine
        .parse(args)

    if (result !== undefined) {
        const validated = result as RunMainParams
        if (validated.paramSet !== 'error'
            || !validated.error.match(/Command [^ ]+ not recognized/)
        ) {
            return validated
        }
    }

    const helpText = getCommandHelp()
    const helpArgIndex = args.findIndex(arg => [''].includes(arg.toLowerCase()))
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

type CleanParameters = {
    paramSet: 'clean'
    dryRun: boolean
}
const cleanCommand: Command<CleanParameters> = {
    command: 'clean', example: '',
    description: 'Remove archive entries and vacuum the database. This option does not vacuum',
    options: [{
        key: 'dry-run', example: '--dry-run',
        description: 'Log the archived entries but do not remove them.',
        default: undefined,
    }],
    action: (params, args) => {
        if (params.length > 0) {
            throw `Unexpected parameters for clean command: ${params.join(' ')}`
        }
        const result: CleanParameters = {
            paramSet: 'clean' as const,
            dryRun: checkFlag(args['dry-run']),
        }
        return result
    },
}

type IgnoreParameters = {
    paramSet: 'ignore action'
    action: 'add'
    ignoreType: IgnoreType
    filePath: string
    hostname?: string
}
const ignoreCommand: Command<IgnoreParameters> = {
    command: 'ignore',
    example: 'add',
    description: 'Add a path to the ignore list. This will mark the path as ignored but not remove any existing entries.',
    options: [{
        key: 'hostname', example: '--hostname <hostname>',
        description: 'The hostname to use for the ignore entry. If not specified, the current hostname will be used.',
        default: undefined,
    }, {
        key: 'prefix', example: '--prefix|--name',
        description: 'The path is a prefix. This will ignore all files that start with the given path.',
        default: undefined,
    }, {
        key: 'name', example: '',
        description: 'The path is a name. This will ignore all files with the given name.',
        default: undefined,
    }],
    action: (params, args) => {
        const [action, filePath, extra] = params
        if (action !== 'add' || filePath === undefined || extra !== undefined) {
            throw `Invalid parameters for ignore command: ${params.join(' ')}`
        }
        const name = checkFlag(args['name'])
        const prefix = checkFlag(args['prefix'])
        if (name && prefix) {
            throw `Cannot specify both --name and --prefix`
        }
        const result: IgnoreParameters = {
            paramSet: 'ignore action',
            action: 'add' as const,
            ignoreType: name ? 'name' : 'prefix',
            filePath: filePath!,
        }
        return result
    },
}

type MergeParameters = {
    paramSet: 'merge'
    remoteDbPath: string
}

const mergeCommand: Command<MergeParameters> = {
    command: 'merge',
    example: '<remote-db-path>',
    description: `Merge the database file with the local database. Conflicting files
    will reserve the latest information, trusting the timestamps
    within the database.`,
    options: [],
    action: (params) => {
        if (params.length !== 1) {
            throw `Invalid parameters for merge command: ${params.join(' ')}`
        }
        const [remoteDbPath] = params
        const result: MergeParameters = {
            paramSet: 'merge',
            remoteDbPath,
        }
        return result
    },
}

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
const showTreeCommand: Command<ShowTreeParameters> = {
    command: 'show-tree',
    example: '',
    description: 'Show a tree-map of the scanned files.',
    options: [{
        key: 'depth', example: '--depth <depth>',
        description: 'The depth of the tree to show. Default is 5. 0 will show all files.',
        default: ['5'],
    }, {
        key: 'hostname', example: '--hostname <host>',
        description: 'Show only files on the given host. If not specified, show all hosts.',
        default: undefined,
    }, {
        key: 'path', example: '--path <path-prefix>',
        description: 'Show only files with the given path prefix.',
        default: undefined,
    }, {
        key: 'keep-alive', example: '--keep-alive',
        description: 'Keep the server alive after showing the tree.',
        default: undefined,
    }, {
        key: 'primary-count', example: '--primary-count <size|descendants>',
        description: 'Base the tree size on the contained size or on the number of descendants.',
        default: ['size'],
    }],
    action: (params, args) => {
        if (params.length > 0) {
            throw `Unexpected parameters for show-tree command: ${params.join(' ')}`
        }
        const depth = parseInt(checkString(args['depth'])!, 10)
        if (isNaN(depth) || depth < 0) {
            throw `Invalid depth argument: ${args['depth']}`
        }
        const hostnameArg = checkString(args['hostname'])
        const pathArg = checkString(args['path'])
        const primaryCountArg = checkString(args['primary-count'])
        if (!(primaryCountArg === 'size' || primaryCountArg === 'descendants')) {
            throw `Invalid primary count argument: ${primaryCountArg}`
        }

        const result: ShowTreeParameters = {
            paramSet: 'show-tree' as const,
            depth,
            hostname: hostnameArg
                ? { isAnyHost: false, host: hostnameArg }
                : { isAnyHost: true },
            path: pathArg
                ? { isAnyPath: false, prefix: pathArg }
                : { isAnyPath: true },
            keepAlive: checkFlag(args['keep-alive']),
            primaryCount: primaryCountArg as PrimaryCountOption,
        }
        return result
    }
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
