export class ApiError extends Error {
  constructor(
    readonly status: number | undefined,
    readonly type: string,
    detail: string,
  ) {
    super(`${status ? `${status} ` : ''}${type}: ${detail}`)
  }

  static async from(response: Response) {
    const text = await response.text()
    try {
      const { error } = JSON.parse(text)
      return new ApiError(response.status, error?.type ?? 'api_error', error?.message ?? text)
    } catch {
      return new ApiError(response.status, 'api_error', text || response.statusText)
    }
  }
}
