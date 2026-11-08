import { peers } from '@sand/devices-contract'
import { type GitFailure, type GitRunner, gitRunner } from '@sand/git-runner/contract'
import { hostChannel } from '@sand/host-runtimes/contract'
import { type OfferedPath, transfers } from '@sand/transfers/contract'
import { errorMessage } from '@sand/util'
import type { ContextCore } from 'drydock'
import { mkdir, readdir, rm, stat } from 'node:fs/promises'
import { type BringInput, type BringStep, type Project, type ProjectOffer, projectsOffer, runtimeProjectCreate } from '../contract'
import type { LocalCopies } from '../local/copies'
import { fullPath } from '../registry/paths'

const longMs = 60 * 60_000

const target = "the PC you're bringing it to"

type Say = (step: string) => void

interface BringDeps {
  here: string
  local: LocalCopies
  services: Pick<ContextCore, 'get'>
  offer: (input: ProjectOffer) => Promise<OfferedPath>
  step: (step: BringStep) => void
}

const cloneProblems: Partial<Record<GitFailure, (remote: string) => string>> = {
  auth: remote => `The PC you're bringing it to can't sign in to ${remote}. Sign in to git on that PC, or copy the files instead.`,
  'not-found': remote => `${remote} wasn't found from ${target}. Check the project's remote, or copy the files instead.`,
}

const clone = async (git: GitRunner, remote: string, path: string) => {
  try {
    await git.ok(path, ['clone', '--', remote, '.'], { timeoutMs: longMs })
  } catch (error) {
    const problem = git.problem(error)
    const explain = problem && cloneProblems[problem.reason]
    throw new Error(explain ? explain(remote) : `Couldn't clone ${remote} on ${target}: ${problem?.message ?? errorMessage(error)}. Try again, or copy the files instead.`)
  }
}

const prepare = async (path: string) => {
  const info = await stat(path).catch(() => undefined)
  if (info && !info.isDirectory()) throw new Error(`${path} is a file. Pick a new or empty folder.`)
  if (info && (await readdir(path)).length > 0) throw new Error(`${path} isn't empty. Pick a new or empty folder.`)
  await mkdir(path, { recursive: true })
  return Boolean(info)
}

const undo = async (path: string, existed: boolean) => {
  await rm(path, { recursive: true, force: true })
  if (existed) await mkdir(path)
}

const filesText = (count: number) => (count === 1 ? '1 file' : `${count} files`)

export const bringProject = ({ here, local, services, offer, step }: BringDeps) => {
  const known = (id: string) => {
    const project = local.projects().find(found => found.id === id)
    if (!project) throw new Error("The PC you're bringing it to doesn't know this project yet. Try again in a moment.")
    return project
  }

  const cloner = (project: Project) => {
    const { remote } = project
    if (!remote) throw new Error(`${project.name} has no git remote to clone. Copy the files instead.`)
    const git = services.get(gitRunner)
    if (!git) throw new Error(`Cloning needs the Git runner plugin, which is off on ${target}.`)
    return async (path: string, say: Say) => {
      say(`Cloning ${remote}…`)
      await clone(git, remote, path)
    }
  }

  const source = (from: string) => {
    if (from === here) return offer
    const linked = services.get(peers)
    if (!linked) throw new Error("The PC you're bringing it to can't reach your other PCs right now.")
    const pc = linked.get(from)
    if (!pc) throw new Error("The PC with the files isn't one of your PCs.")
    if (pc.status.phase !== 'connected') throw new Error(`${pc.name} is offline. Turn it on, or bring the project from another PC.`)
    return (input: ProjectOffer) => linked.call(from, projectsOffer, input, { timeout: longMs })
  }

  const copier = ({ project, from, how, files }: BringInput) => {
    const receiver = services.get(transfers)
    if (!receiver) throw new Error(`Copying files needs the File transfers plugin, which is off on ${target}.`)
    const ask = source(from)
    return async (path: string, say: Say) => {
      say(how === 'copy' ? 'Copying the files…' : `Copying ${filesText(files.length)}…`)
      const offered = await ask({ project, how, files })
      await receiver.savePath({ ...offered, ...(from !== here && { from }), path })
    }
  }

  return async (input: BringInput) => {
    const project = known(input.project)
    const copy = project.copies[input.from]
    if (!copy || copy.removed) throw new Error(`${project.name} has no copy on the PC you picked to bring it from.`)
    const host = services.get(hostChannel)
    if (!host) throw new Error(`Adding a copy needs sand's host, which isn't running on ${target}.`)
    const cloned = input.how === 'clone' ? cloner(project) : undefined
    const copied = input.how === 'copy' || input.files.length > 0 ? copier(input) : undefined
    const path = fullPath(input.path)
    const say = (text: string) => step({ project: project.id, path, step: text })
    const existed = await prepare(path)
    try {
      await cloned?.(path, say)
      await copied?.(path, say)
      say('Adding the copy…')
      return await host.call(runtimeProjectCreate, { folder: path, copyOf: project.id })
    } catch (error) {
      await undo(path, existed)
      throw error
    }
  }
}
