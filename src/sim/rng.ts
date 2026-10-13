export interface Rng {
  state: number
  next(): number
  range(min: number, max: number): number
  int(min: number, max: number): number
  angle(): number
}

const TWO_PI = Math.PI * 2

export function createRng(seed: number): Rng {
  let state = seed >>> 0

  const next = (): number => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  return {
    get state() {
      return state
    },
    set state(value: number) {
      state = value >>> 0
    },
    next,
    range(min: number, max: number): number {
      return min + next() * (max - min)
    },
    int(min: number, max: number): number {
      return min + Math.floor(next() * (max - min + 1))
    },
    angle(): number {
      return next() * TWO_PI
    },
  }
}
