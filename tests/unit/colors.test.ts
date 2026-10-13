import { describe, it, expect } from 'vitest'
import { COLORS, antColor } from '../../src/render/colors'

describe('antColor', () => {
  it('maps built-in type ids to their documented colors', () => {
    expect(antColor('worker')).toBe('#f3ead9')
    expect(antColor('scout')).toBe('#7fc8ff')
    expect(antColor('trailblazer')).toBe('#ffb36b')
  })

  it('keeps the worker color equal to COLORS.ant', () => {
    expect(antColor('worker')).toBe(COLORS.ant)
  })

  it('is deterministic for repeated calls', () => {
    expect(antColor('custom-1')).toBe(antColor('custom-1'))
    expect(antColor('custom-42')).toBe(antColor('custom-42'))
  })

  it('returns a valid hsl string for unknown ids distinct from the worker color', () => {
    const color = antColor('custom-1')
    expect(color).toMatch(/^hsl\(\d+ 72% 72%\)$/)
    expect(color).not.toBe(COLORS.ant)
  })

  it('can produce different colors for different custom ids', () => {
    expect(antColor('custom-1')).not.toBe(antColor('custom-2'))
  })
})
