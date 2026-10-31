export const githubHost = 'github.com'
export const apiUrl = 'https://api.github.com'
export const graphqlUrl = `${apiUrl}/graphql`

export const apiHeaders = (token: string): Record<string, string> => ({
  authorization: `Bearer ${token}`,
  accept: 'application/vnd.github+json',
  'x-github-api-version': '2022-11-28',
  'user-agent': 'sand',
})
