export const COLORS = {
  background: '#0b0e13',
  arenaBackground: '#141a22',
  arenaBorder: '#232c38',
  wall: '#39404d',
  wallEdge: '#4c5563',
  obstacle: '#8b919b',
  obstaclePreview: 'rgba(139,145,155,0.35)',
  nest: '#d8ab5f',
  nestCore: '#7d5a24',
  food: '#57d16a',
  foodEdge: '#2c7a3c',
  ant: '#f3ead9',
  antCarry: '#ffd970',
  brush: 'rgba(255,255,255,0.85)',
  brushFill: 'rgba(255,255,255,0.08)',
} as const

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

export function antColor(typeId: string): string {
  if (typeId === 'blank') {
    return COLORS.ant
  }
  return `hsl(${hashString(typeId) % 360} 72% 72%)`
}
