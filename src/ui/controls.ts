export interface ControlHandlers {
  onTogglePlay(): void
  onStep(): void
  onReset(): void
  onNewSeed(): void
  onToggleMaze(): void
}

export interface ControlsHandle {
  setPaused(paused: boolean): void
  setMaze(enabled: boolean): void
}

export function createControls(root: HTMLElement, handlers: ControlHandlers): ControlsHandle {
  root.innerHTML = `
    <button type="button" class="control primary" data-testid="control-play">Play</button>
    <button type="button" class="control" data-testid="control-step">Step</button>
    <button type="button" class="control" data-testid="control-reset">Reset</button>
    <button type="button" class="control" data-testid="control-reseed">New seed</button>
    <button type="button" class="control" data-testid="control-maze" title="Toggle maze layout (rebuilds the arena)">Maze</button>
  `

  const play = root.querySelector('[data-testid="control-play"]') as HTMLButtonElement
  play.addEventListener('click', () => handlers.onTogglePlay())
  root
    .querySelector('[data-testid="control-step"]')
    ?.addEventListener('click', () => handlers.onStep())
  root
    .querySelector('[data-testid="control-reset"]')
    ?.addEventListener('click', () => handlers.onReset())
  root
    .querySelector('[data-testid="control-reseed"]')
    ?.addEventListener('click', () => handlers.onNewSeed())
  const maze = root.querySelector('[data-testid="control-maze"]') as HTMLButtonElement
  maze.addEventListener('click', () => handlers.onToggleMaze())

  return {
    setPaused(paused: boolean): void {
      play.textContent = paused ? 'Play' : 'Pause'
      play.classList.toggle('active', !paused)
    },
    setMaze(enabled: boolean): void {
      maze.classList.toggle('active', enabled)
    },
  }
}
