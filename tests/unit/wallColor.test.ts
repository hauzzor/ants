import { describe, it, expect } from 'vitest'
import { COLORS } from '../../src/render/colors'
import { wallColor } from '../../src/render/wallColor'

describe('wallColor', () => {
  it('returns null for open cells', () => {
    expect(wallColor(0)).toBeNull()
  })

  it('returns null for unknown cell values', () => {
    expect(wallColor(3)).toBeNull()
    expect(wallColor(-1)).toBeNull()
    expect(wallColor(1.5)).toBeNull()
    expect(wallColor(Number.NaN)).toBeNull()
  })

  it('maps walls to the wall color', () => {
    expect(wallColor(1)).toBe(COLORS.wall)
  })

  it('maps obstacles to the obstacle color', () => {
    expect(wallColor(2)).toBe(COLORS.obstacle)
  })

  it('uses a clearly grey obstacle tone', () => {
    expect(COLORS.obstacle).toBe('#8b919b')
  })

  it('keeps obstacle and wall colors distinct', () => {
    expect(COLORS.obstacle).not.toBe(COLORS.wall)
  })
})
