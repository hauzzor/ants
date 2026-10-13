import { getAntTypes } from '../sim'
import type { AntType, World } from '../sim'

export interface AntPanelDeps {
  getWorld(): World
  onSelectType(id: string): void
  onCreateType(description: string): AntType
}

export interface AntPanelHandle {
  refresh(): void
}

export const DEFAULT_TYPE_DESCRIPTION = 'all-round worker'

export function describeType(
  types: Record<string, AntType>,
  id: string,
): string {
  const type = types[id]
  if (!type) return ''
  return type.description === '' ? DEFAULT_TYPE_DESCRIPTION : type.description
}

export function createAntPanel(
  root: HTMLElement,
  deps: AntPanelDeps,
): AntPanelHandle {
  root.innerHTML = `
    <div class="ant-type-select">
      <label for="ant-panel-nest-type">Nest spawns</label>
      <select id="ant-panel-nest-type" data-testid="nest-type"></select>
      <p class="ant-type-desc" data-testid="nest-type-description"></p>
    </div>
    <div class="ant-type-create">
      <input type="text" data-testid="ant-description" placeholder="Describe behavior, e.g. fast curious scout" />
      <button type="button" class="control" data-testid="create-ant-type">Create type</button>
    </div>
  `

  const select = root.querySelector<HTMLSelectElement>(
    'select[data-testid="nest-type"]',
  )
  if (!select) throw new Error('ant panel select missing')

  const description = root.querySelector<HTMLParagraphElement>(
    'p[data-testid="nest-type-description"]',
  )
  if (!description) throw new Error('ant panel description missing')

  const input = root.querySelector<HTMLInputElement>(
    'input[data-testid="ant-description"]',
  )
  if (!input) throw new Error('ant panel input missing')

  const button = root.querySelector<HTMLButtonElement>(
    'button[data-testid="create-ant-type"]',
  )
  if (!button) throw new Error('ant panel button missing')

  const updateDescription = (id: string): void => {
    description.textContent = describeType(deps.getWorld().types, id)
  }

  const refresh = (): void => {
    const world = deps.getWorld()
    const types = getAntTypes(world)
    const options = types.map((type) => {
      const option = document.createElement('option')
      option.value = type.id
      option.textContent = type.name
      return option
    })
    select.replaceChildren(...options)

    const selectedId = types.some((type) => type.id === world.nestTypeId)
      ? world.nestTypeId
      : (types[0]?.id ?? '')
    if (selectedId !== '') select.value = selectedId

    updateDescription(select.value)
  }

  select.addEventListener('change', () => {
    deps.onSelectType(select.value)
    updateDescription(select.value)
  })

  const submit = (): void => {
    const text = input.value.trim()
    if (text === '') return
    const type = deps.onCreateType(text)
    deps.onSelectType(type.id)
    input.value = ''
    refresh()
  }

  button.addEventListener('click', submit)
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') submit()
  })

  refresh()

  return { refresh }
}
