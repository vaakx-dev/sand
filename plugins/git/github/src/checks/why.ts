import { errorMessage } from '@sand/util'
import type { Client } from '../api/client'
import { explainLog } from './log'
import { type Check, passed } from './read'

interface Job {
  steps: { name: string; conclusion: string | null }[]
}

type Logs = Pick<Client, 'rest' | 'text'>

const failedStep = (job: Job) => job.steps.find(step => step.conclusion !== null && !passed(step.conclusion))?.name

const whyFailed = async (client: Logs, repo: string, { job }: Check) => {
  if (job === undefined) return []
  try {
    const [details, log] = await Promise.all([client.rest<Job>('GET', `${repo}/actions/jobs/${job}`), client.text(`${repo}/actions/jobs/${job}/logs`)])
    return explainLog(log, failedStep(details))
  } catch (error) {
    return [`Couldn't read its log: ${errorMessage(error)}`]
  }
}

export { type Logs, whyFailed }
