import { useEffect, useSyncExternalStore } from 'react'
import { useAuth } from '../auth/AuthContext'
import { loadAdminData, loadExecutiveData, loadResourcePersonData } from './firestoreData'
import { slotState, sourceVersion, subscribeSource, type SlotName, type SlotState } from './source'

/**
 * Which account's data has been fetched. One load per signed-in official, not one per
 * mount: the free tier allows 50,000 reads a day, and re-running the whole set every
 * time a section is opened would spend them on data already in memory. A different
 * account signing in gets its own load, because the queries are keyed to their uid.
 */
let loadedFor: string | null = null

/**
 * Pulls whatever the signed-in role may read, once, and reports which source each
 * collection is being served from. The role decides the queries because the security
 * rules do: an executive asking for every call would simply be refused.
 */
export function useDataSource(slot: SlotName): SlotState<unknown> {
  const { state } = useAuth()
  const role = state.status === 'ready' ? state.staff.role : null
  const uid = state.status === 'ready' ? state.staff.userId : null

  useEffect(() => {
    if (!role || !uid || loadedFor === uid) return
    loadedFor = uid
    void (role === 'admin'
      ? loadAdminData()
      : role === 'executive'
        ? loadExecutiveData(uid)
        : loadResourcePersonData(uid))
  }, [role, uid])

  useSyncExternalStore(subscribeSource, sourceVersion, sourceVersion)
  return slotState(slot)
}
