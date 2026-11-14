import { cliCommands } from '@sand/cli-commands/contract'
import { daemon } from '@sand/host-daemon/contract'
import { definePlugin } from 'drydock'
import { type FollowedPull, pullFollow, pullFollows, pullUnfollow } from './contract'

const USAGE = [
  'sand pr follow <thread> <pr>    wake the thread when the PR\'s CI finishes, a review or comment lands, or it merges, closes or conflicts',
  'sand pr unfollow <thread> <pr>  stop waking the thread for that PR',
  'sand pr list <thread>           list the PRs the thread follows',
  '                                <pr> is a pull request URL or owner/name#number',
].join('\n')

const line = (pull: FollowedPull) => `${pull.repo}#${pull.number}  ${pull.title}${pull.error ? `  (${pull.error})` : ''}`

const usage = () => {
  console.error(`usage:\n${USAGE}`)
  return 2
}

export default definePlugin({
  name: 'pull-watch-cli',
  description: 'The sand pr command: follow and unfollow pull requests from a thread, and list what it follows, through the running sand',
  inject: { cliCommands, daemon },
  apply(ctx) {
    ctx.effect(() =>
      ctx.cliCommands.register({
        name: 'pr',
        summary: 'follow and unfollow pull requests from a thread',
        usage: USAGE,
        async run([action, thread, pull]) {
          if (!thread) return usage()
          if (action === 'list') {
            const pulls = await ctx.daemon.request(pullFollows, { thread })
            console.log(pulls.length ? pulls.map(line).join('\n') : 'This thread follows no pull requests.')
            return
          }
          if (!pull) return usage()
          if (action === 'follow') return console.log(`Following ${line(await ctx.daemon.request(pullFollow, { thread, pull }))}`)
          if (action === 'unfollow') return console.log((await ctx.daemon.request(pullUnfollow, { thread, pull })) ? 'Stopped following it.' : "The thread wasn't following it.")
          return usage()
        },
      }),
    )
  },
})
