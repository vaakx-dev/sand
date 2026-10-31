import type { GitLayout, GitRepo, GitRunner } from '@sand/git/contract'
import { keyedSerial } from '@sand/util'
import { resolve } from 'node:path'
import type { GitActionResult, GitProgress } from '../contract'
import { failedThrow, failure } from './failure'
import { createProgress, type Progress, type ProgressPlace } from './progress'

export interface PerformDeps {
  git: GitRunner
  repos: GitRepo
  send(progress: GitProgress): void
  report(error: unknown): void
}

export interface Job {
  git: GitRunner
  repo: GitLayout
  progress: Progress
}

export interface FolderJob {
  git: GitRunner
  repos: GitRepo
  cwd: string
  progress: Progress
}

type Work<T, J> = (job: J) => Promise<GitActionResult<T>>

export type Performer = ReturnType<typeof createPerformer>

export const createPerformer = ({ git, repos, send, report }: PerformDeps) => {
  const queue = keyedSerial()

  const perform = async <T>(place: ProgressPlace, work: (progress: Progress) => Promise<GitActionResult<T>>): Promise<GitActionResult<T>> => {
    const progress = createProgress(send, place)
    try {
      return await work(progress)
    } catch (error) {
      return failedThrow(git, error)
    } finally {
      progress.stop()
      await repos.refresh(place.cwd).catch(report)
    }
  }

  const inRepo = <T>(place: ProgressPlace, serial: boolean, work: Work<T, Job>) =>
    perform<T>(place, async progress => {
      const repo = await repos.layout(place.cwd)
      if (!repo) return failure('not-a-repo', "This folder isn't a git repository.")
      const job = () => work({ git, repo, progress })
      return serial ? queue(repo.commonDir, job) : job()
    })

  return {
    mutate: <T>(place: ProgressPlace, work: Work<T, Job>) => inRepo(place, true, work),
    read: <T>(place: ProgressPlace, work: Work<T, Job>) => inRepo(place, false, work),
    folder: <T>(place: ProgressPlace, work: Work<T, FolderJob>) =>
      perform<T>(place, progress => queue(resolve(place.cwd), () => work({ git, repos, cwd: place.cwd, progress }))),
  }
}
