import type { CliCommand } from '@sand/protocol'

export const defaultCommand = 'launch'

const column = 32

const kernelUsage = [
  'sand serve                      run sand in the foreground (it restarts plugins without dropping the page)',
  'sand stop                       stop the background sand',
  'sand -p "<prompt>" [-c | -r <id>] [--home <folder>] [--cwd <folder>] [--model <name>] [--effort <level>] [--fast]',
  '                                test runner: run one prompt or /command without a server and print the reply',
]

const kernelOptions = [
  '  --safe      safe mode: run only the built-in plugins and ignore sand.toml plugin settings and your own plugins;',
  '              works with sand, sand serve and sand -p (or set SAND_SAFE=1). Leave it from the banner in the page',
  '  -c          open the most recent thread',
  '  -r <id>     open the thread with this id',
  '  --fast      fast mode on models that have it: quicker replies at a higher price',
  '  --cwd <dir>             the folder a -p thread works in',
  '  --home <dir>            keep threads and settings in this folder instead of ~/.sand, e.g. for tests (or set SAND_HOME);',
  '                          it borrows ~/.sand/sand.toml and ~/.sand/auth.json until it has its own',
]

const usageOf = (command: CliCommand) => command.usage ?? `${`sand ${command.name}`.padEnd(column)}${command.summary}`

const ordered = (commands: CliCommand[]) => {
  const first = commands.filter(command => command.name === defaultCommand)
  const rest = commands.filter(command => command.name !== defaultCommand)
  return [...first.map(usageOf), ...kernelUsage, ...rest.map(usageOf)]
}

export const helpText = (commands: CliCommand[]) => {
  const usage = ordered(commands)
    .flatMap(text => text.split('\n'))
    .map((line, index) => `${index ? '       ' : 'usage: '}${line}`)
  const options = commands.flatMap(command => (command.options ? command.options.split('\n') : []))
  return [...usage, '', ...kernelOptions, ...options].join('\n')
}
