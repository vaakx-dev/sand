class Axis {
  readonly #starts: Float64Array

  constructor(sizes: number[]) {
    this.#starts = new Float64Array(sizes.length + 1)
    sizes.forEach((size, index) => {
      this.#starts[index + 1] = this.#starts[index]! + size
    })
  }

  get count() {
    return this.#starts.length - 1
  }

  get total() {
    return this.#starts[this.count]!
  }

  start(index: number) {
    return this.#starts[Math.max(0, Math.min(index, this.count))]!
  }

  at(offset: number) {
    let low = 0
    let high = this.count - 1
    while (low < high) {
      const middle = (low + high + 1) >> 1
      if (this.#starts[middle]! <= offset) low = middle
      else high = middle - 1
    }
    return low
  }
}

export { Axis }
