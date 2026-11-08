import { afterEach, expect, test } from 'bun:test'
import { readArgs } from '../src/app/args'

const saved = process.env.SAND_HOME

afterEach(() => {
  if (saved === undefined) delete process.env.SAND_HOME
  else process.env.SAND_HOME = saved
})

test.each([[['--home', '', 'stop']], [['--home', '  ', 'stop']], [['--home=', 'stop']], [['stop', '--home']]])(
  'a blank --home fails instead of using ~/.sand: %j',
  argv => {
    delete process.env.SAND_HOME
    expect(() => readArgs(argv)).toThrow('--home is empty')
  },
)

test('a blank SAND_HOME fails instead of using ~/.sand', () => {
  process.env.SAND_HOME = ' '
  expect(() => readArgs(['stop'])).toThrow('SAND_HOME is empty')
})
