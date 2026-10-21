import type { CliCommand, CliOption } from './contract'

const column = 32

const kernelUsage = [
  'sand -p "<prompt>" [--model <name>] [--effort <level>] [--fast]',
  '                                test runner: run one prompt in the folder\'s chat without a server and print the reply',
]

const kernelOptions = [
  '  --safe                  safe mode: run only the built-in plugins and ignore sand.toml plugin settings and your own plugins;',
  '                          works with sand, sand serve and sand -p (or set SAND_SAFE=1). Leave it from the banner in the page',
  '  --cwd <dir>             the folder a -p chat works in',
  '  --home <dir>            keep chats and settings in this folder instead of ~/.sand, e.g. for tests (or set SAND_HOME);',
  '                          it borrows ~/.sand/sand.toml and ~/.sand/auth.json until it has its own',
  '  --model, --effort, --fast   the model settings of a -p chat; fast mode is quicker and costs more on models that have it',
]

const usageOf = (command: CliCommand) => command.usage ?? `${`sand ${command.name}`.padEnd(column)}${command.summary}`

const optionLine = ([name, option]: [string, CliOption]) => {
  const flag = `--${name}${option.type === 'string' ? ' <value>' : ''}${option.short ? `, -${option.short}` : ''}`
  return `  ${flag.padEnd(22)}  ${option.help}`
}

const ordered = (commands: CliCommand[]) => [
  ...commands.filter(command => command.default).map(usageOf),
  ...kernelUsage,
  ...commands.filter(command => !command.default).map(usageOf),
]

export const helpText = (commands: CliCommand[]) => {
  const usage = ordered(commands)
    .flatMap(text => text.split('\n'))
    .map((line, index) => `${index ? '       ' : 'usage: '}${line}`)
  const options = commands.flatMap(command => Object.entries(command.options ?? {}).map(optionLine))
  return [...usage, '', ...kernelOptions, ...options].join('\n')
}
