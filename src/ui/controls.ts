export interface ControlHandlers {
  onTogglePlay(): void
  onStep(): void
  onReset(): void
  onNewSeed(): void
}

export interface ControlsHandle {
  setPaused(paused: boolean): void
}

export function createControls(root: HTMLElement, handlers: ControlHandlers): ControlsHandle {
  root.innerHTML = `
    <button type="button" class="control primary" data-testid="control-play">Play</button>
    <button type="button" class="control" data-testid="control-step">Step</button>
    <button type="button" class="control" data-testid="control-reset">Reset</button>
    <button type="button" class="control" data-testid="control-reseed">New seed</button>
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

  return {
    setPaused(paused: boolean): void {
      play.textContent = paused ? 'Play' : 'Pause'
      play.classList.toggle('active', !paused)
    },
  }
}
