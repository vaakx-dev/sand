const queries = [
  /\x1b\[[0-9;?]*n/g,
  /\x1b\[[>0-9;?]*c/g,
  /\x1b\[[0-9;?]*R/g,
  /\x1b\[\??[0-9;]*\$p/g,
  /\x1b\[>[0-9;]*q/g,
  /\x1b\[\?u/g,
  /\x1b\](?:1[0-2]);\?(?:\x07|\x1b\\)/g,
  /\x1bP[01]?[$+]q[^\x1b\x07]*(?:\x07|\x1b\\)/g,
]

const replies = /^(?:\x1b\[\d+;\d+R|\x1b\[[?>][0-9;]*c|\x1b\[\??[0-9;]*\$y|\x1b\](?:1[0-2]);rgb:[0-9a-fA-F/]*(?:\x07|\x1b\\)|\x1bP[01][$+]r[^\x1b]*\x1b\\)+$/

export const withoutQueries = (text: string) => queries.reduce((kept, query) => kept.replace(query, ''), text)

export const isReply = (data: string) => replies.test(data)
