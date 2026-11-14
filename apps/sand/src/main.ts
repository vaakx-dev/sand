#!/usr/bin/env bun
import { errorMessage, tildeHome } from '@sand/util'
import { readArgs } from './app/args'
import { run } from './app/run'

try {
  await run(readArgs(process.argv.slice(2)))
} catch (error) {
  console.error(tildeHome(errorMessage(error)))
  process.exit(1)
}
