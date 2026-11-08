import { debouncedWatch } from '@sand/util/fs'
import { joinDisposers } from '@sand/util'
import { dirname } from 'node:path'
import type { SshHost } from '../../contract'
import type { Ssh } from '../ssh/run'
import { readSshConfig } from './config'
import { destinationArgs, parseTarget, shownTarget } from './target'

const unrelated = /^(known_hosts|authorized_keys)|\.pub$/

export const resolveTarget = async (ssh: Ssh, host: string) => {
  const target = parseTarget(host)
  if (!target) return host
  const result = await ssh({ destination: ['-G', ...destinationArgs(target)] }).exited.catch(() => undefined)
  return result?.code === 0 ? shownTarget(result.stdout) : host
}

export const createHostList = (folder: string, ssh: Ssh, changed: () => void) => {
  let hosts: SshHost[] = []
  let stopWatching = () => {}
  let stopped = false

  const watch = (files: string[]) => {
    stopWatching()
    const folders = [...new Set([folder, ...files.map(file => dirname(file))])]
    const only = (watched: string) => (name: string | null) => watched !== folder || !name || !unrelated.test(name)
    stopWatching = joinDisposers(...folders.map(watched => debouncedWatch(watched, { only: only(watched) }, update)))
  }

  const refresh = async () => {
    const config = await readSshConfig(folder)
    const next = await Promise.all(config.aliases.map(async alias => ({ id: alias, name: alias, target: await resolveTarget(ssh, alias) })))
    if (stopped) return
    watch(config.files)
    if (JSON.stringify(next) === JSON.stringify(hosts)) return
    hosts = next
    changed()
  }

  let ready = refresh()
  const update = () => void (ready = refresh())

  return {
    hosts: () => hosts,
    ready: () => ready,
    stop() {
      stopped = true
      stopWatching()
    },
  }
}
