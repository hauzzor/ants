import { describe, it, expect } from 'vitest'
import { COLORS, antColor } from '../../src/render/colors'

describe('antColor', () => {
  it('maps the blank type id to the off-white ant color', () => {
    expect(antColor('blank')).toBe('#f3ead9')
  })

  it('keeps the blank color equal to COLORS.ant', () => {
    expect(antColor('blank')).toBe(COLORS.ant)
  })

  it('is deterministic for repeated calls', () => {
    expect(antColor('custom-1')).toBe(antColor('custom-1'))
    expect(antColor('custom-42')).toBe(antColor('custom-42'))
  })

  it('returns a valid hsl string for player-created ids', () => {
    const color = antColor('custom-1')
    expect(color).toMatch(/^hsl\(\d+ 72% 72%\)$/)
    expect(color).not.toBe(COLORS.ant)
  })

  it('can produce different colors for different custom ids', () => {
    expect(antColor('custom-1')).not.toBe(antColor('custom-2'))
  })

  it('treats unknown legacy ids as hashed custom colors', () => {
    expect(antColor('scout')).toMatch(/^hsl\(\d+ 72% 72%\)$/)
    expect(antColor('trailblazer')).toMatch(/^hsl\(\d+ 72% 72%\)$/)
    expect(antColor('worker')).toMatch(/^hsl\(\d+ 72% 72%\)$/)
    expect(antColor('scout')).not.toBe('#7fc8ff')
    expect(antColor('trailblazer')).not.toBe('#ffb36b')
  })
})
