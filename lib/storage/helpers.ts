/**
 * Shared localStorage helper functions
 * SSR-safe utilities for reading and writing to localStorage
 */

// In-memory cache for batched operations
// Stores data with a dirty flag to track which entries need to be flushed
const cache = new Map<string, { data: unknown; dirty: boolean }>()

/**
 * Get a value from cache, falling back to localStorage if not cached
 * @param key - The localStorage key to read
 * @param defaultValue - Value to return if key doesn't exist
 * @returns The cached or stored value
 */
export function getStorageCached<T>(key: string, defaultValue: T): T {
  const cached = cache.get(key)
  if (cached !== undefined) {
    return cached.data as T
  }

  const data = getStorage(key, defaultValue)
  cache.set(key, { data, dirty: false })
  return data
}

/**
 * Set a value in cache (does not write to localStorage until flush)
 * @param key - The localStorage key to write
 * @param value - The value to cache
 */
export function setStorageCached(key: string, value: unknown): void {
  cache.set(key, { data: value, dirty: true })
}

/**
 * Flush all dirty cache entries to localStorage
 * Call this after batched operations are complete
 */
export function flushStorage(): void {
  for (const [key, entry] of cache.entries()) {
    if (entry.dirty) {
      setStorage(key, entry.data)
      cache.set(key, { data: entry.data, dirty: false })
    }
  }
}

/**
 * Invalidate cache entries
 * @param key - Optional specific key to invalidate, or all if not provided
 */
export function invalidateCache(key?: string): void {
  if (key !== undefined) {
    cache.delete(key)
  } else {
    cache.clear()
  }
}

/**
 * Safely read a value from localStorage with SSR safety
 * @param key - The localStorage key to read
 * @param defaultValue - Value to return if key doesn't exist or on error
 * @returns The parsed value or defaultValue
 */
export function getStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') {
    return defaultValue
  }
  try {
    const item = localStorage.getItem(key)
    if (item === null || item === '') {
      return defaultValue
    }
    return JSON.parse(item) as T
  } catch (error) {
    console.warn(`[Storage] Failed to read "${key}":`, error)
    return defaultValue
  }
}

/**
 * Safely write a value to localStorage with SSR safety
 * @param key - The localStorage key to write
 * @param value - The value to store (will be JSON stringified)
 * @returns true if the write succeeded, false otherwise
 */
export function setStorage(key: string, value: unknown): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.error(`[Storage] Quota exceeded when writing "${key}" - user data may be lost`)
    } else {
      console.error(`[Storage] Failed to write "${key}":`, error)
    }
    return false
  }
}
