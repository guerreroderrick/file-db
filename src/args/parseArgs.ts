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
        .command(syncCommand)
    const result: RunMainParams = commandLine
        .parse(args)

    return result
}

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

type SyncParameters = {
    paramSet: 'sync'
    filePath: string
}
const syncCommand: Command<SyncParameters> = {
    command: 'sync',
    example: '<path>',
    description: 'Sync the database with the file system. This will update the database to match the current state of the file system.',
    options: [],
    action: (params) => {
        if (params.length !== 1) {
            throw `Invalid arguments for sync command: ${params.join(' ')}`
        }
        const [filePath] = params
        const result: SyncParameters = {
            paramSet: 'sync' as const,
            filePath,
        }
        return result
    },
}
