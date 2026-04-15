// src/lib/useProperty.js
// Reusable hook for fetching/saving properties
import { useState, useCallback } from 'react'
import { fetchPropertyBySlug, upsertProperty, isConfigured } from './supabase'

export function useProperty(slug) {
  const [data, setData]   = useState(null)
  const [state, setState] = useState('idle') // idle | loading | done | error | notfound
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!slug) return
    if (!isConfigured()) { setState('error'); setError('Supabase chưa được cấu hình'); return }
    setState('loading')
    try {
      const row = await fetchPropertyBySlug(slug)
      if (row) { setData(row); setState('done') }
      else { setState('notfound') }
    } catch (e) {
      setError(e.message); setState('error')
    }
  }, [slug])

  const save = useCallback(async (payload) => {
    setState('loading')
    try {
      const result = await upsertProperty(payload)
      setState('done')
      return result
    } catch (e) {
      setError(e.message); setState('error')
      throw e
    }
  }, [])

  return { data, state, error, load, save, setData }
}
