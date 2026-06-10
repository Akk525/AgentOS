import { getEnvironment } from '../desktop/desktopBridge'
import type { LocalStore } from './localStoreTypes'
import { memoryLocalStore } from './memoryLocalStore'
import { tauriLocalStore } from './tauriLocalStore'

let _store: LocalStore | null = null

export function getLocalStore(): LocalStore {
  if (_store) return _store
  _store = getEnvironment() === 'tauri' ? tauriLocalStore : memoryLocalStore
  return _store
}

export type {
  LocalStore,
  StoreInitResult,
  StoreStatus,
  UpsertNodeInput,
  UpsertEdgeInput,
  UpsertSessionInput,
  ListEventsOptions,
} from './localStoreTypes'
