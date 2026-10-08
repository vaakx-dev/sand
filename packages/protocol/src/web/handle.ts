export interface Handle<T> {
  update(patch?: Partial<T>): void
  dispose(): void
}
