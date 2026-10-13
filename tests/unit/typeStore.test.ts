import { describe, expect, it } from 'vitest'
import type { StoredTypes } from '../../src/ui/typeStore'
import { TYPE_STORE_KEY, loadTypeStore, saveTypeStore } from '../../src/ui/typeStore'

function fakeStorage(initial: Record<string, string> = {}): {
  storage: Pick<Storage, 'getItem' | 'setItem'>
  backing: Record<string, string>
} {
  const backing = { ...initial }
  return {
    storage: {
      getItem: (key: string) => (key in backing ? backing[key]! : null),
      setItem: (key: string, value: string) => {
        backing[key] = value
      },
    },
    backing,
  }
}

const sample: StoredTypes = {
  types: {
    blank: { id: 'blank', name: 'Blank', lifespan: 60, abilities: [] },
    worker: {
      id: 'worker',
      name: 'Worker',
      lifespan: 120,
      abilities: [{ kind: 'emit', pheromone: 'food', intensity: 5, condition: 'carrying' }],
    },
  },
  nestTypeId: 'worker',
}

describe('typeStore', () => {
  it('round-trips a saved store', () => {
    const { storage } = fakeStorage()
    saveTypeStore(sample, storage)
    expect(loadTypeStore(storage)).toEqual(sample)
  })

  it('uses the ants.types.v1 key', () => {
    const { storage, backing } = fakeStorage()
    saveTypeStore(sample, storage)
    expect(Object.keys(backing)).toEqual([TYPE_STORE_KEY])
  })

  it('returns null on invalid JSON', () => {
    const { storage } = fakeStorage({ [TYPE_STORE_KEY]: '{not json' })
    expect(loadTypeStore(storage)).toBeNull()
  })

  it('returns null when the payload is not an object', () => {
    const { storage } = fakeStorage({ [TYPE_STORE_KEY]: JSON.stringify([1, 2]) })
    expect(loadTypeStore(storage)).toBeNull()
  })

  it('returns null when types is missing', () => {
    const { storage } = fakeStorage({
      [TYPE_STORE_KEY]: JSON.stringify({ nestTypeId: 'blank' }),
    })
    expect(loadTypeStore(storage)).toBeNull()
  })

  it('returns null when no type is usable', () => {
    const { storage } = fakeStorage({
      [TYPE_STORE_KEY]: JSON.stringify({
        types: {
          /* intentionally empty */
        },
        nestTypeId: 'gone',
      }),
    })
    const loaded = loadTypeStore(storage)
    expect(loaded).toBeNull()
  })

  it('repairs a missing blank entry and unknown nestTypeId', () => {
    const { storage } = fakeStorage({
      [TYPE_STORE_KEY]: JSON.stringify({
        types: {
          worker: {
            id: 'worker',
            name: 'Worker',
            lifespan: 100,
            abilities: [],
          },
        },
        nestTypeId: 'worker',
      }),
    })
    const loaded = loadTypeStore(storage)
    expect(loaded).not.toBeNull()
    if (loaded === null) return
    expect(loaded.nestTypeId).toBe('worker')
    expect(loaded.types.blank).toEqual({ id: 'blank', name: 'Blank', lifespan: 60, abilities: [] })
  })

  it('falls back to blank when nestTypeId is invalid', () => {
    const { storage } = fakeStorage({
      [TYPE_STORE_KEY]: JSON.stringify({
        types: { blank: { id: 'blank', name: 'Blank', lifespan: 1, abilities: [] } },
        nestTypeId: 'ghost',
      }),
    })
    const loaded = loadTypeStore(storage)
    if (loaded === null) throw new Error('expected load to succeed')
    expect(loaded.nestTypeId).toBe('blank')
  })

  it('passes abilities through sanitization on load', () => {
    const { storage } = fakeStorage({
      [TYPE_STORE_KEY]: JSON.stringify({
        types: {
          worker: {
            id: 'worker',
            name: 'Worker',
            lifespan: 999,
            abilities: [
              { kind: 'walk', speed: 500 },
              { kind: 'mystery-sense' },
            ],
          },
        },
        nestTypeId: 'worker',
      }),
    })
    const loaded = loadTypeStore(storage)
    if (loaded === null) throw new Error('expected load to succeed')
    const worker = loaded.types.worker
    if (!worker) throw new Error('missing worker type')
    expect(worker.lifespan).toBe(300)
    expect(worker.abilities).toEqual([{ kind: 'walk', speed: 80 }])
  })

  it('skips malformed entries and null ability entries', () => {
    const { storage } = fakeStorage({
      [TYPE_STORE_KEY]: JSON.stringify({
        types: {
          nope: 'text',
          bad: { id: 'bad', name: 42, lifespan: 10, abilities: [] },
          other: { id: 'other', name: 'Other', lifespan: 10, abilities: [null, { kind: 'walk', speed: 4 }] },
        },
        nestTypeId: 'blank',
      }),
    })
    const loaded = loadTypeStore(storage)
    if (loaded === null) throw new Error('expected load to succeed')
    const other = loaded.types.other
    if (!other) throw new Error('missing other type')
    expect(Object.keys(loaded.types).sort()).toEqual(['blank', 'other'])
    expect(other.abilities).toEqual([{ kind: 'walk', speed: 4 }])
  })

  it('overwrites a stored blank entry with the canonical blank type', () => {
    const { storage } = fakeStorage({
      [TYPE_STORE_KEY]: JSON.stringify({
        types: {
          blank: { id: 'blank', name: 'Blank', lifespan: 180, abilities: [{ kind: 'walk', speed: 40 }] },
          worker: { id: 'worker', name: 'Worker', lifespan: 100, abilities: [] },
        },
        nestTypeId: 'blank',
      }),
    })
    const loaded = loadTypeStore(storage)
    if (loaded === null) throw new Error('expected load to succeed')
    expect(loaded.types.blank).toEqual({ id: 'blank', name: 'Blank', lifespan: 60, abilities: [] })
  })

  it('truncates names longer than 40 characters', () => {
    const { storage } = fakeStorage({
      [TYPE_STORE_KEY]: JSON.stringify({
        types: {
          worker: {
            id: 'worker',
            name: 'X'.repeat(41),
            lifespan: 100,
            abilities: [],
          },
        },
        nestTypeId: 'worker',
      }),
    })
    const loaded = loadTypeStore(storage)
    if (loaded === null) throw new Error('expected load to succeed')
    const worker = loaded.types.worker
    if (!worker) throw new Error('missing worker type')
    expect(worker.name).toBe('X'.repeat(40))
  })

  it('trims names when loading', () => {
    const { storage } = fakeStorage({
      [TYPE_STORE_KEY]: JSON.stringify({
        types: {
          worker: {
            id: 'worker',
            name: '  Padded  ',
            lifespan: 100,
            abilities: [],
          },
        },
        nestTypeId: 'worker',
      }),
    })
    const loaded = loadTypeStore(storage)
    if (loaded === null) throw new Error('expected load to succeed')
    const worker = loaded.types.worker
    if (!worker) throw new Error('missing worker type')
    expect(worker.name).toBe('Padded')
  })

  it('falls back to a non-empty name when the stored name is blank', () => {
    const { storage } = fakeStorage({
      [TYPE_STORE_KEY]: JSON.stringify({
        types: {
          worker: {
            id: 'worker',
            name: '   ',
            lifespan: 100,
            abilities: [],
          },
        },
        nestTypeId: 'worker',
      }),
    })
    const loaded = loadTypeStore(storage)
    if (loaded === null) throw new Error('expected load to succeed')
    const worker = loaded.types.worker
    if (!worker) throw new Error('missing worker type')
    expect(worker.name).toBe('Custom ant')
  })

  it('swallows storage failures when saving', () => {
    const storage: Pick<Storage, 'setItem'> = {
      setItem: () => {
        throw new Error('quota')
      },
    }
    expect(() => saveTypeStore(sample, storage)).not.toThrow()
  })

  it('tolerates a missing storage implementation on load', () => {
    expect(loadTypeStore(undefined)).toBeNull()
  })
})
