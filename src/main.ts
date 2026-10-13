const canvas = document.querySelector<HTMLCanvasElement>('#arena')
if (!canvas) {
  throw new Error('Could not find #arena canvas element')
}

const ctx = canvas.getContext('2d')
if (!ctx) {
  throw new Error('2D canvas context is unavailable')
}

ctx.fillStyle = '#1b1b1f'
ctx.fillRect(0, 0, canvas.width, canvas.height)
