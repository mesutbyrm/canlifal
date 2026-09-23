// Push Notification Utility Functions

export const isPushSupported = (): boolean => {
  if (typeof window === 'undefined') return false
  return 'Notification' in window && 'serviceWorker' in navigator
}

export const getPermissionStatus = (): NotificationPermission | 'unsupported' => {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission
}

// Helper to get OneSignal from window
const getOneSignal = (): any | null => {
  if (typeof window !== 'undefined' && (window as any).OneSignal) {
    return (window as any).OneSignal
  }
  return null
}

export const requestNotificationPermission = async (): Promise<NotificationPermission | 'unsupported'> => {
  if (!isPushSupported()) return 'unsupported'
  
  try {
    // Always request native browser permission FIRST — this is the most reliable approach
    console.log('Requesting native notification permission...')
    const permission = await Notification.requestPermission()
    console.log('Native notification permission result:', permission)
    
    if (permission === 'granted') {
      // Now try to opt into OneSignal push subscription
      const OneSignal = getOneSignal()
      if (OneSignal) {
        try {
          const sub = OneSignal.User?.PushSubscription
          if (sub && !sub.optedIn) {
            await sub.optIn()
            console.log('OneSignal: opted in after native permission grant')
          }
          // Wait a moment and log subscription status
          await new Promise(r => setTimeout(r, 500))
          console.log('OneSignal subscription token:', sub?.token ? sub.token.substring(0, 20) + '...' : 'none yet')
        } catch (e) {
          console.log('OneSignal opt-in after native permission failed:', e)
        }
      } else {
        console.log('OneSignal not available, native permission granted only')
      }
    }
    
    return permission
  } catch (error) {
    console.error('Error requesting notification permission:', error)
    // Try to return actual permission status even on error
    try {
      return Notification.permission
    } catch {
      return 'denied'
    }
  }
}

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  // OneSignal handles its own service worker, no need to register separately
  return null
}

export const showBrowserNotification = async (
  title: string,
  body: string,
  options?: {
    tag?: string
    url?: string
    count?: number
    icon?: string
  }
): Promise<boolean> => {
  if (!isPushSupported()) return false
  if (Notification.permission !== 'granted') return false
  
  try {
    // Try using Service Worker first for better reliability
    const registration = await navigator.serviceWorker.ready
    if (registration) {
      registration.active?.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        body,
        tag: options?.tag || 'falclub-notification',
        url: options?.url || '/',
        count: options?.count || 1
      })
      return true
    }
    
    // Fallback to regular Notification API
    const notification = new Notification(title, {
      body: options?.count && options.count > 1 ? `${body} (${options.count} yeni bildirim)` : body,
      icon: options?.icon || '/logo.png',
      tag: options?.tag || 'falclub-notification',
      renotify: true,
      silent: false
    })
    
    notification.onclick = () => {
      window.focus()
      if (options?.url) {
        window.location.href = options.url
      }
      notification.close()
    }
    
    return true
  } catch (error) {
    console.error('Error showing notification:', error)
    return false
  }
}

// Play notification sound
export const playNotificationSound = (): void => {
  if (typeof window === 'undefined') return
  
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    
    const audioContext = new AudioContextClass()
    
    const playTone = (freq: number, startTime: number, duration: number) => {
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.setValueAtTime(freq, startTime)
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0, startTime)
      gainNode.gain.linearRampToValueAtTime(0.4, startTime + 0.02)
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + duration - 0.05)
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration)
      
      oscillator.start(startTime)
      oscillator.stop(startTime + duration)
    }
    
    const now = audioContext.currentTime
    playTone(880, now, 0.15)
    playTone(1174.66, now + 0.15, 0.2)
    
  } catch (e) {
    console.log('Audio notification not supported')
  }
}
