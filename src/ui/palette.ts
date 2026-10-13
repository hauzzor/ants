import { TOOLS } from '../input/tools'
import type { ToolId } from '../input/tools'

export interface PaletteHandle {
  select(id: ToolId): void
}

export function createPalette(
  root: HTMLElement,
  current: () => ToolId,
  onSelect: (id: ToolId) => void,
): PaletteHandle {
  root.innerHTML = TOOLS.map(
    (tool) =>
      `<button type="button" class="tool" data-tool="${tool.id}" data-testid="tool-${tool.id}" title="${tool.hint}">${tool.label}</button>`,
  ).join('')

  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('.tool'))

  const refresh = (): void => {
    const active = current()
    for (const button of buttons) {
      button.classList.toggle('active', button.dataset.tool === active)
    }
  }

  for (const button of buttons) {
    button.addEventListener('click', () => {
      const id = button.dataset.tool as ToolId
      onSelect(id)
      refresh()
    })
  }

  refresh()

  return {
    select(id: ToolId): void {
      onSelect(id)
      refresh()
    },
  }
}
