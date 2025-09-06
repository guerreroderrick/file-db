import { assert } from "@std/assert/assert";

export type ErrorSet = {
    paramSet: 'error'
    error: string
    helpText: string
}
export type HelpSet = {
    paramSet: 'help'
    helpText: string
}

export type Option = {
    key: string
    example: string
    description: string
    default: string[] | undefined
}

export type Command<T> = {
    command: string
    example: string
    description: string
    options: Option[]
    action: (parameters: string[], options: Record<string, string[] | undefined>) => T
}


export function checkFlag(args: string[] | undefined) {
    if (args === undefined) { return false }
    if (args.length === 0) { return true }
    assert(false, `Unexpected arguments for flag: ${args}`)
}
export function checkString(args: string[] | undefined) {
    if (args === undefined) { return undefined }
    if (args.length === 1) { return args[0] }
    if (args.length === 0) {
        assert(false, `Missing argument for option`)
    }
    assert(false, `Too many arguments for option: ${args}`)
}

export class CommandLine<GlobalOptions, ResultType = ErrorSet | HelpSet> {
    globalOptions: Option[] = [{
        key: 'help',
        default: undefined,
        example: '--help',
        description: 'Describe the available options',
    }]
    commands: Command<ResultType>[] = []
    private configureGlobals: (globals: Record<string, string[] | undefined>) => GlobalOptions

    constructor(
        optoins: Option[],
        configureGlobals: (globals: Record<string, string[] | undefined>) => GlobalOptions
    ) {
        for (const option of optoins) {
            assert(!this.globalOptions.some(_ => _.key === option.key), `Option ${option.key} already added`)
            this.globalOptions.push(option)
        }
        this.configureGlobals = configureGlobals
    }

    getHelpText(commandName: string | undefined) {
        const command = this.commands.find(_ => _.command === commandName)
        const globalOptionsExample = this.globalOptions
            .map(_ => `[${_.example}]`)
            .join(' ')
        const globalOptionsHelp = this.globalOptions
            .map(_ => `  --${_.key}\t${_.description} (default: ${_.default ?? 'undefined'})`)
            .join('\n')
        if (command === undefined) {
            let prefix = ''
            if (commandName !== undefined) {
                prefix = `Command ${commandName} is not known\n`
            }
            const commandHelp = this.commands
                .map(_ => `  ${_.command}\t${_.description}`)
                .join('\n')
            return `${prefix}${globalOptionsExample} <command> [params...] [options]\n${globalOptionsHelp}\nCommands:\n${commandHelp}`
        }
        const commandOptionsExample = command.options
            .map(_ => `[${_.example}]`)
            .join(' ')
        const commandOptionsHelp = command.options
            .map(_ => `  --${_.key}\t${_.description} (default: ${_.default ?? 'undefined'})`)
            .join('\n')
        return `${globalOptionsExample} ${command.command} ${command.example}${commandOptionsExample}\nCommand options:\n${commandOptionsHelp}`
    }

    command<AddResultType>(
        command: Command<AddResultType>
    ): CommandLine<ResultType | (AddResultType & GlobalOptions)>
    {
        assert(!this.commands.some(_ => _.command === command.command), `Command ${command.command} already added`)
        ; (this.commands as unknown as Command<ResultType | AddResultType>[]).push(command)
        return this as unknown as CommandLine<ResultType | (AddResultType & GlobalOptions)>
    }

    parse(args: readonly string[]): undefined | ResultType {
        const parameters: string[] = []
        const argOptions: Record<string, string[] | undefined> = {}
        const optionSet = [...this.globalOptions]

        let currentOption: Option | undefined
        let foundCommand: Command<ResultType> | undefined
        for (const arg of args) {
            if (arg.startsWith('--')) {
                const key = arg.substring(2)
                const option = optionSet.find(o => o.key === key)
                if (option === undefined) {
                    return ({
                        paramSet: 'error',
                        error: `Option ${arg} not recognized.`,
                        helpText: this.getHelpText(foundCommand?.command),
                    }) as ResultType
                }
                currentOption = option
                argOptions[currentOption.key] ??= []
            } else if (foundCommand === undefined) {
                if (currentOption !== undefined) {
                    argOptions[currentOption.key] ??= []
                    argOptions[currentOption.key]!.push(arg)
                    currentOption = undefined
                    continue
                }
                const command = this.commands.find(c => c.command === arg)
                if (command === undefined) {
                    return ({
                        paramSet: 'error',
                        error: `Command ${arg} not recognized`,
                        helpText: this.getHelpText(undefined),
                    }) as ResultType
                }
                foundCommand = command
                optionSet.push(...foundCommand.options)
            } else if (currentOption !== undefined) {
                argOptions[currentOption.key]!.push(arg)
            } else {
                parameters.push(arg)
            }
        }
        if (argOptions['help'] !== undefined) {
            const helpCommand = argOptions['help'][0]
            return ({
                paramSet: 'help',
                helpText: this.getHelpText(foundCommand?.command ?? helpCommand),
            }) as ResultType
        }
        if (foundCommand === undefined) {
            return ({
                paramSet: 'error',
                error: `No command found in ${args}`,
                helpText: this.getHelpText(undefined),
            }) as ResultType
        }
        for (const o of optionSet) {
            argOptions[o.key] ??= o.default
        }
        try {
            const result = foundCommand.action(parameters, argOptions);
            const globals = this.configureGlobals(argOptions)
            return {
                ...globals,
                ...result,
            }
        } catch (e) {
            return {
                paramSet: 'error',
                error: `Error processing command ${foundCommand.command}: ${e}`,
                helpText: this.getHelpText(foundCommand.command),
            } as ResultType
        }
    }
}
