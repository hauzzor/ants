import { COLORS } from './colors'

export function wallColor(value: number): string | null {
  switch (value) {
    case 1:
      return COLORS.wall
    case 2:
      return COLORS.obstacle
    default:
      return null
  }
}
