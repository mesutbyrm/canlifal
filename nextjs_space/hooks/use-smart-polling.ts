'use client'

import { useEffect, useRef, useCallback } from 'react'

interface SmartPollingOptions {
  /** Polling interval in milliseconds when tab is visible */
  interval: number
  /** Polling interval when tab is hidden (default: paused / Infinity) */
  hiddenInterval?: number
  /** Whether polling is enabled (default: true) */
  enabled?: boolean
  /** Run immediately on mount (default: true) */
  immediate?: boolean
}

/**
 * Smart polling hook that:
 * 1. Pauses/slows when tab is not visible (Page Visibility API)
 * 2. Cleans up properly on unmount
 * 3. Supports dynamic enable/disable
 * 
 * Usage:
 *   useSmartPolling(() => fetchData(), { interval: 5000 })
 *   useSmartPolling(() => fetchData(), { interval: 5000, hiddenInterval: 30000 })
 */
export function useSmartPolling(
  callback: () => void | Promise<void>,
  options: SmartPollingOptions
) {
  const { interval, hiddenInterval, enabled = true, immediate = true } = options
  const callbackRef = useRef(callback)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isVisibleRef = useRef(true)

  // Keep callback ref up to date without re-triggering effect
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const clearCurrentInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const startPolling = useCallback((ms: number) => {
    clearCurrentInterval()
    if (ms > 0 && ms < Infinity) {
      intervalRef.current = setInterval(() => {
        callbackRef.current()
      }, ms)
    }
  }, [clearCurrentInterval])

  useEffect(() => {
    if (!enabled) {
      clearCurrentInterval()
      return
    }

    // Initial call
    if (immediate) {
      callbackRef.current()
    }

    // Start with appropriate interval based on current visibility
    const currentInterval = document.hidden
      ? (hiddenInterval ?? 0) // 0 = paused when hidden by default
      : interval
    startPolling(currentInterval)

    // Visibility change handler
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden
      if (document.hidden) {
        // Tab hidden: slow down or pause
        const ms = hiddenInterval ?? 0
        if (ms === 0) {
          clearCurrentInterval()
        } else {
          startPolling(ms)
        }
      } else {
        // Tab visible again: fetch immediately + resume normal interval
        callbackRef.current()
        startPolling(interval)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearCurrentInterval()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [interval, hiddenInterval, enabled, immediate, startPolling, clearCurrentInterval])
}
