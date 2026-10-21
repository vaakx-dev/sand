const preflightHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'authorization, content-type',
  'access-control-allow-private-network': 'true',
  'access-control-max-age': '600',
}

export const preflight = () => new Response(null, { status: 204, headers: preflightHeaders })

export const withCors = (response: Response) => {
  response.headers.set('access-control-allow-origin', '*')
  return response
}
