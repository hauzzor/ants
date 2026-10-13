import './editor.css'
import { BLANK_TYPE, getAntTypes } from '../sim'
import type { Ability, AntType, AntTypeDraft, World } from '../sim/types'
import {
  ABILITY_KINDS,
  ABILITY_KIND_DESCRIPTIONS,
  ABILITY_KIND_LABELS,
  ABILITY_SPECS,
  CONDITION_OPTIONS,
  DIRECTION_OPTIONS,
  FIELD_DESCRIPTIONS,
  IDENTITY_DESCRIPTIONS,
  OPTION_LABELS,
  PHEROMONE_OPTIONS,
  SELECT_FIELD_LABELS,
  type AbilityKind,
  freshDraft,
  newAbility,
} from './abilityDrafts'

const BLANK_TYPE_ID = 'blank'

export interface AntPanelDeps {
  getWorld(): World
  onSelectType(id: string): void
  onSaveType(draft: AntTypeDraft, id?: string): AntType | undefined
  onDeleteType(id: string): void
  onPreviewType(draft: AntTypeDraft): void
}

export interface AntPanelHandle {
  refresh(): void
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className !== undefined) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function fieldRow(labelText: string, control: HTMLElement, desc?: HTMLElement): HTMLElement {
  const controlId = control.dataset.testid ?? ''
  if (controlId) {
    control.id = controlId
    if (desc) control.setAttribute('aria-describedby', desc.id)
  }
  const row = el('div', 'ant-editor-field')
  const label = el('label', 'ant-editor-label', labelText) as HTMLLabelElement
  if (controlId) label.htmlFor = controlId
  row.append(label, control)
  if (desc) row.append(desc)
  return row
}

function labeledRow(labelText: string, control: HTMLElement): HTMLElement {
  return fieldRow(labelText, control)
}

function descriptionEl(descId: string, text: string): HTMLParagraphElement {
  const desc = el('p', 'field-desc', text)
  desc.id = descId
  desc.dataset.testid = descId
  return desc
}

function describedControl(labelText: string, control: HTMLElement, desc: HTMLElement): HTMLElement {
  return fieldRow(labelText, control, desc)
}

function option(value: string, text: string, selected: boolean): HTMLOptionElement {
  const opt = document.createElement('option')
  opt.value = value
  opt.textContent = text
  opt.selected = selected
  return opt
}

function numberInput(
  testid: string,
  min: number,
  max: number,
  step: number,
  value: number,
): HTMLInputElement {
  const input = el('input', 'ability-input') as HTMLInputElement
  input.type = 'number'
  input.dataset.testid = testid
  input.min = String(min)
  input.max = String(max)
  input.step = String(step)
  input.value = String(value)
  return input
}

function selectInput(
  testid: string,
  options: readonly string[],
  value: string,
): HTMLSelectElement {
  const select = el('select', 'ability-input') as HTMLSelectElement
  select.dataset.testid = testid
  for (const optionValue of options) {
    select.add(option(optionValue, OPTION_LABELS[optionValue] ?? optionValue, optionValue === value))
  }
  return select
}

function readNumber(input: HTMLInputElement, fallback: number, min: number, max: number): number {
  const value = Number(input.value)
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

function readEnum(input: HTMLSelectElement, values: readonly string[], fallback: string): string {
  return values.includes(input.value) ? input.value : fallback
}

export function createAntPanel(root: HTMLElement, deps: AntPanelDeps): AntPanelHandle {
  root.classList.add('ant-editor')

  const nestSelect = el('select') as HTMLSelectElement
  nestSelect.dataset.testid = 'nest-type'

  const nestDescription = el('p', 'field-desc')
  nestDescription.dataset.testid = 'nest-type-description'
  nestDescription.id = 'nest-type-description'

  const editSelect = el('select') as HTMLSelectElement
  editSelect.dataset.testid = 'edit-type'

  const nameInput = el('input') as HTMLInputElement
  nameInput.type = 'text'
  nameInput.dataset.testid = 'ant-type-name'

  const lifespanInput = el('input') as HTMLInputElement
  lifespanInput.type = 'number'
  lifespanInput.dataset.testid = 'ant-type-lifespan'
  lifespanInput.min = '1'
  lifespanInput.max = '300'
  lifespanInput.step = '1'

  const addKindSelect = el('select') as HTMLSelectElement
  addKindSelect.dataset.testid = 'add-ability-kind'
  for (const kind of ABILITY_KINDS) {
    addKindSelect.add(option(kind, ABILITY_KIND_LABELS[kind], kind === 'walk'))
  }

  const addAbilityButton = el('button', 'control')
  addAbilityButton.type = 'button'
  addAbilityButton.dataset.testid = 'add-ability'
  addAbilityButton.textContent = 'Add ability'

  const newTypeButton = el('button', 'control')
  newTypeButton.type = 'button'
  newTypeButton.dataset.testid = 'new-type'
  newTypeButton.textContent = 'New type'

  const saveTypeButton = el('button', 'control primary')
  saveTypeButton.type = 'button'
  saveTypeButton.dataset.testid = 'save-type'
  saveTypeButton.textContent = 'Save type'

  const deleteTypeButton = el('button', 'control danger')
  deleteTypeButton.type = 'button'
  deleteTypeButton.dataset.testid = 'delete-type'
  deleteTypeButton.textContent = 'Delete type'

  const previewTypeButton = el('button', 'control')
  previewTypeButton.type = 'button'
  previewTypeButton.dataset.testid = 'preview-type'
  previewTypeButton.textContent = 'Preview type'

  const abilityList = el('div', 'ability-list')
  abilityList.dataset.testid = 'ability-list'

  const header = el('div', 'ant-editor-section')
  header.append(describedControl('Nest spawns', nestSelect, nestDescription))

  const identity = el('div', 'ant-editor-section ant-editor-grid')
  identity.append(
    describedControl(
      'Edit type',
      editSelect,
      descriptionEl('edit-type-desc', IDENTITY_DESCRIPTIONS.editType),
    ),
    describedControl(
      'Name',
      nameInput,
      descriptionEl('ant-type-name-desc', IDENTITY_DESCRIPTIONS.name),
    ),
    describedControl(
      'Lifespan',
      lifespanInput,
      descriptionEl('ant-type-lifespan-desc', IDENTITY_DESCRIPTIONS.lifespan),
    ),
  )

  const toolbar = el('div', 'ant-editor-section ant-editor-toolbar')
  toolbar.append(labeledRow('Add', addKindSelect), addAbilityButton)

  const actions = el('div', 'ant-editor-section ant-editor-actions')
  actions.append(newTypeButton, saveTypeButton, deleteTypeButton, previewTypeButton)

  root.append(header, identity, toolbar, abilityList, actions)

  const draft: AntTypeDraft = freshDraft(BLANK_TYPE)
  let editingId: string | null = null

  function currentTypes(): AntType[] {
    return getAntTypes(deps.getWorld())
  }

  function editingTarget(): { id: string | undefined; existing: boolean } {
    if (editingId === null || editingId === BLANK_TYPE_ID) {
      return { id: undefined, existing: false }
    }
    return { id: editingId, existing: Boolean(deps.getWorld().types[editingId]) }
  }

  function updateSummary(): void {
    const world = deps.getWorld()
    const nest = world.types[world.nestTypeId]
    const count = nest ? nest.abilities.length : 0
    const summary = count === 0 ? 'no abilities' : `${count} abilities`
    nestDescription.textContent = `${IDENTITY_DESCRIPTIONS.nestSpawns} · ${summary}`
  }

  function updateButtons(): void {
    const { id, existing } = editingTarget()
    deleteTypeButton.disabled = !existing || id === BLANK_TYPE_ID
  }

  function syncDraftInputs(): void {
    nameInput.value = draft.name
    lifespanInput.value = String(draft.lifespan)
  }

  function syncEditSelect(): void {
    const types = currentTypes()
    if (!types.some((type) => type.id === editingId)) {
      editingId = types.find((type) => type.id === BLANK_TYPE_ID)?.id ?? types[0]?.id ?? null
    }
    editSelect.replaceChildren()
    for (const type of types) {
      editSelect.add(option(type.id, type.name, type.id === editingId))
    }
  }

  function buildFieldNumber(
    index: number,
    field: { name: string; key: string; min: number; max: number; step: number },
    ability: Ability,
  ): HTMLElement {
    const testid = `ability-${index}-${field.key}`
    const input = numberInput(testid, field.min, field.max, field.step, Number(ability[field.key as keyof Ability]))
    input.addEventListener('input', () => {
      const target = draft.abilities[index]
      if (!target) return
      const record = target as unknown as Record<string, number>
      record[field.key] = readNumber(input, field.min, field.min, field.max)
    })
    return describedControl(
      field.name,
      input,
      descriptionEl(`${testid}-desc`, FIELD_DESCRIPTIONS[field.key] ?? ''),
    )
  }

  function buildFieldSelect(
    index: number,
    field: string,
    options: readonly string[],
    ability: Ability,
  ): HTMLElement {
    const testid = `ability-${index}-${field}`
    const select = selectInput(testid, options, String(ability[field as keyof Ability]))
    select.addEventListener('change', () => {
      const target = draft.abilities[index]
      if (!target) return
      const record = target as unknown as Record<string, string>
      record[field] = readEnum(select, options, options[0] ?? 'always')
    })
    return describedControl(
      SELECT_FIELD_LABELS[field] ?? field,
      select,
      descriptionEl(`${testid}-desc`, FIELD_DESCRIPTIONS[field] ?? ''),
    )
  }

  function buildAbilityRow(index: number, ability: Ability): HTMLElement {
    const kind = ability.kind as AbilityKind
    const row = el('div', 'ability-row')
    row.dataset.testid = `ability-row-${index}`
    row.dataset.kind = kind

    const headText = el('div', 'ability-head-text')
    headText.append(
      el('span', 'ability-kind', ABILITY_KIND_LABELS[kind]),
      descriptionEl(`ability-${index}-desc`, ABILITY_KIND_DESCRIPTIONS[kind]),
    )

    const duplicateButton = el('button', 'ability-btn')
    duplicateButton.type = 'button'
    duplicateButton.dataset.testid = `ability-${index}-duplicate`
    duplicateButton.textContent = 'Duplicate'
    duplicateButton.addEventListener('click', () => {
      const copy = structuredClone(draft.abilities[index])
      if (!copy) return
      draft.abilities.splice(index + 1, 0, copy)
      renderAbilityList()
    })

    const removeButton = el('button', 'ability-btn ability-btn-danger')
    removeButton.type = 'button'
    removeButton.dataset.testid = `ability-${index}-remove`
    removeButton.textContent = 'Remove'
    removeButton.addEventListener('click', () => {
      draft.abilities.splice(index, 1)
      renderAbilityList()
    })

    const headActions = el('div', 'ability-row-actions')
    headActions.append(duplicateButton, removeButton)

    const headerRow = el('div', 'ability-row-head')
    headerRow.append(headText, headActions)
    row.append(headerRow)

    const fields = el('div', 'ability-fields')
    const specs = ABILITY_SPECS[ability.kind as AbilityKind]

    if (ability.kind === 'emit' || ability.kind === 'follow') {
      fields.append(buildFieldSelect(index, 'pheromone', PHEROMONE_OPTIONS, ability))
    }
    if (ability.kind === 'follow') {
      fields.append(buildFieldSelect(index, 'direction', DIRECTION_OPTIONS, ability))
    }
    for (const field of specs) {
      fields.append(buildFieldNumber(index, field, ability))
    }
    if (ability.kind === 'emit' || ability.kind === 'follow') {
      fields.append(buildFieldSelect(index, 'condition', CONDITION_OPTIONS, ability))
    }
    row.append(fields)
    return row
  }

  function renderAbilityList(): void {
    const rows = draft.abilities.map((ability, index) => buildAbilityRow(index, ability))
    abilityList.replaceChildren(...rows)
    if (draft.abilities.length === 0) {
      const empty = el('p', 'ability-empty', 'no abilities')
      abilityList.append(empty)
    }
  }

  addKindSelect.addEventListener('change', () => {
    const kind = addKindSelect.value as AbilityKind
    if (!ABILITY_KINDS.includes(kind)) addKindSelect.value = 'walk'
  })

  nestSelect.addEventListener('change', () => {
    if (nestSelect.value === '') return
    deps.onSelectType(nestSelect.value)
    updateSummary()
  })

  editSelect.addEventListener('change', () => {
    const id = editSelect.value
    const target = deps.getWorld().types[id]
    if (!target) return
    editingId = target.id
    draft.name = target.name
    draft.lifespan = target.lifespan
    draft.abilities = target.abilities.map((ability) => structuredClone(ability))
    syncDraftInputs()
    renderAbilityList()
    updateButtons()
  })

  nameInput.addEventListener('input', () => {
    draft.name = nameInput.value
  })

  lifespanInput.addEventListener('input', () => {
    draft.lifespan = readNumber(lifespanInput, 1, 1, 300)
  })

  addAbilityButton.addEventListener('click', () => {
    const kind = addKindSelect.value as AbilityKind
    draft.abilities.push(newAbility(kind))
    renderAbilityList()
  })

  newTypeButton.addEventListener('click', () => {
    editingId = null
    const next = freshDraft(BLANK_TYPE)
    draft.name = next.name
    draft.lifespan = next.lifespan
    draft.abilities = next.abilities
    syncDraftInputs()
    renderAbilityList()
    updateButtons()
  })

  saveTypeButton.addEventListener('click', () => {
    const { id, existing } = editingTarget()
    const saved = existing && id !== undefined ? deps.onSaveType(draft, id) : deps.onSaveType(draft)
    if (!saved) return
    editingId = saved.id
    draft.name = saved.name
    draft.lifespan = saved.lifespan
    draft.abilities = saved.abilities.map((ability: Ability) => structuredClone(ability))
    refresh()
  })

  deleteTypeButton.addEventListener('click', () => {
    const { id, existing } = editingTarget()
    if (!existing || id === undefined) return
    deps.onDeleteType(id)
    editingId = null
    const next = freshDraft(BLANK_TYPE)
    draft.name = next.name
    draft.lifespan = next.lifespan
    draft.abilities = next.abilities
    refresh()
  })

  previewTypeButton.addEventListener('click', () => {
    deps.onPreviewType(draft)
  })

  function refresh(): void {
    const world = deps.getWorld()
    const types = currentTypes()

    nestSelect.replaceChildren()
    for (const type of types) {
      nestSelect.add(option(type.id, type.name, type.id === world.nestTypeId))
    }
    const first = types[0]
    if (first && !types.some((type) => type.id === nestSelect.value)) {
      nestSelect.value = first.id
    }

    syncEditSelect()
    updateSummary()
    updateButtons()
    syncDraftInputs()
    renderAbilityList()
  }

  refresh()

  return { refresh }
}
