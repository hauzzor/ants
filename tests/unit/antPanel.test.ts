import { describe, expect, it } from 'vitest'
import { describeType } from '../../src/ui/antPanel'
import type { AntType } from '../../src/sim/types'

const types: Record<string, AntType> = {
  worker: { id: 'worker', name: 'Worker', description: '' },
  scout: { id: 'scout', name: 'Scout', description: 'fast curious scout' },
}

describe('describeType', () => {
  it('returns the description of the selected type', () => {
    expect(describeType(types, 'scout')).toBe('fast curious scout')
  })

  it('falls back to the default description for an empty description', () => {
    expect(describeType(types, 'worker')).toBe('all-round worker')
  })

  it('returns empty string for an unknown id', () => {
    expect(describeType(types, 'missing')).toBe('')
  })
})
