import type { GitRunner } from '@sand/git/contract'

export interface PushTarget {
  remote: string
  branch: string
}

const fields = ['%(push:remotename)', '%(push:remoteref)', '%(upstream:remotename)', '%(upstream:remoteref)'].join('%09')

const branchOf = (ref: string | undefined) => (ref?.startsWith('refs/heads/') ? ref.slice('refs/heads/'.length) : undefined)

export const pushTarget = async (git: GitRunner, cwd: string, branch: string): Promise<PushTarget> => {
  const result = await git.run(cwd, ['for-each-ref', `--format=${fields}`, `refs/heads/${branch}`], { read: true })
  const line = result.code === 0 ? (result.out.split(/\r?\n/)[0] ?? '') : ''
  const [pushRemote, pushRef, upstreamRemote, upstreamRef] = line.split('\t')
  return {
    remote: pushRemote || upstreamRemote || 'origin',
    branch: branchOf(pushRef) ?? branchOf(upstreamRef) ?? branch,
  }
}
