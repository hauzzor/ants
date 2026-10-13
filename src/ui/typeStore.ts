import type { Ability, AntType } from '../sim/types'
import { BLANK_TYPE, sanitizeAbilities } from '../sim'

export interface StoredTypes {
  types: Record<string, AntType>
  nestTypeId: string
}

export const TYPE_STORE_KEY = 'ants.types.v1'
const BLANK_TYPE_ID = 'blank'
const BLANK_FALLBACK_NAME = 'Blank'
const MAX_NAME_LENGTH = 40

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

function defaultStorage(): StorageLike | undefined {
  return typeof localStorage !== 'undefined' ? localStorage : undefined
}

function sanitizeLifespan(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return BLANK_TYPE.lifespan
  return Math.min(300, Math.max(1, Math.round(raw)))
}

function sanitizeName(raw: string): string {
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed.slice(0, MAX_NAME_LENGTH) : 'Custom ant'
}

function isShapeObject(raw: unknown): boolean {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw)
}

function blankEntry(): AntType {
  return {
    id: BLANK_TYPE_ID,
    name: BLANK_FALLBACK_NAME,
    lifespan: BLANK_TYPE.lifespan,
    abilities: [],
  }
}

function parseStoredTypes(payload: unknown): StoredTypes | null {
  if (!isShapeObject(payload)) return null
  const record = payload as { types?: unknown; nestTypeId?: unknown }
  if (!isShapeObject(record.types)) return null
  const rawTypes = record.types as Record<string, unknown>
  const types: Record<string, AntType> = {}
  for (const raw of Object.values(rawTypes)) {
    if (!isShapeObject(raw)) continue
    const entry = raw as Record<string, unknown>
    const id = typeof entry.id === 'string' && entry.id !== '' ? entry.id : null
    if (id === null || typeof entry.name !== 'string') continue
    types[id] = {
      id,
      name: sanitizeName(entry.name),
      lifespan: sanitizeLifespan(entry.lifespan),
      abilities: sanitizeAbilities(
        (Array.isArray(entry.abilities) ? entry.abilities : []).filter(
          isShapeObject,
        ) as Ability[],
      ),
    }
  }
  if (Object.keys(types).length === 0) return null
  types[BLANK_TYPE_ID] = blankEntry()
  const nestTypeId =
    typeof record.nestTypeId === 'string' && types[record.nestTypeId]
      ? record.nestTypeId
      : BLANK_TYPE_ID
  return { types, nestTypeId }
}

export function loadTypeStore(
  storage: Pick<Storage, 'getItem'> | undefined = defaultStorage(),
): StoredTypes | null {
  if (storage === undefined) return null
  let payload: unknown
  try {
    const raw = storage.getItem(TYPE_STORE_KEY)
    if (raw === null) return null
    payload = JSON.parse(raw)
  } catch {
    return null
  }
  return parseStoredTypes(payload)
}

export function saveTypeStore(
  store: StoredTypes,
  storage: Pick<Storage, 'setItem'> | undefined = defaultStorage(),
): void {
  if (storage === undefined) return
  try {
    storage.setItem(TYPE_STORE_KEY, JSON.stringify(store))
  } catch {
    return
  }
}
