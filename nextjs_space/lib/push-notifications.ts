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
    const OneSignal = getOneSignal()
    
    if (OneSignal) {
      // Use OneSignal's native prompt which handles both permission + subscription
      try {
        // First try the slidedown prompt
        await OneSignal.Slidedown.promptPush()
        console.log('OneSignal: slidedown prompt shown')
        
        // After prompt, check if user opted in
        const sub = OneSignal.User?.PushSubscription
        if (sub?.optedIn) {
          console.log('OneSignal: user subscribed via prompt')
          return 'granted'
        }
      } catch (e) {
        console.log('OneSignal slidedown failed, trying native + optIn:', e)
      }
      
      // Fallback: request native permission, then opt into OneSignal
      const permission = await Notification.requestPermission()
      
      if (permission === 'granted') {
        try {
          const sub = OneSignal.User?.PushSubscription
          if (sub && !sub.optedIn) {
            await sub.optIn()
            console.log('OneSignal: opted in after native permission grant, token:', sub.token?.substring(0, 20) + '...')
          }
        } catch (e) {
          console.log('OneSignal opt-in after native permission failed:', e)
        }
      }
      
      return permission
    } else {
      // OneSignal not loaded yet, just request native permission
      console.log('OneSignal not available, requesting native permission only')
      const permission = await Notification.requestPermission()
      return permission
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error)
    return 'denied'
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
