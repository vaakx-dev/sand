export class ProviderTrouble extends Error {
  override name = 'ProviderTrouble'

  constructor(
    message: string,
    readonly waitMs?: number,
    options?: ErrorOptions,
  ) {
    super(message, options)
  }
}
