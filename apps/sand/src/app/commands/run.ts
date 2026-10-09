import type { CliCommands, CliValues } from '@sand/protocol'
import { errorMessage } from '@sand/kit'
import { helpText } from './help'

export const runCommand = async (commands: CliCommands, [name = 'help', ...args]: string[], values: CliValues) => {
  const command = commands.list().find(candidate => candidate.name === name)
  if (!command && name === 'help') {
    console.log(helpText(commands.list()))
    return 0
  }
  if (!command) {
    console.error(`unknown command "${name}"\n${helpText(commands.list())}`)
    return 2
  }
  try {
    return (await command.run(args, values)) ?? 0
  } catch (error) {
    console.error(errorMessage(error))
    return 1
  }
}
