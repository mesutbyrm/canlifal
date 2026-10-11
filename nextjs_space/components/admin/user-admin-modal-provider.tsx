'use client'

/**
 * BÖLÜM 21 / A2 — §40: TEK merkezi kullanıcı modalı.
 * Uygulamanın herhangi bir yerinden openUserAdmin(userId) çağrılarak aynı modal açılır.
 */

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import type { Section } from './user-management-center'

const UserManagementCenter = dynamic(() => import('./user-management-center'), { ssr: false })

type Ctx = {
  openUserAdmin: (userId: string, section?: Section) => void
  closeUserAdmin: () => void
  isOpen: boolean
}

const UserAdminModalContext = createContext<Ctx>({
  openUserAdmin: () => {},
  closeUserAdmin: () => {},
  isOpen: false,
})

export function useUserAdminModal() {
  return useContext(UserAdminModalContext)
}

export default function UserAdminModalProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ userId: string; section: Section } | null>(null)

  const openUserAdmin = useCallback((userId: string, section: Section = 'general') => {
    if (!userId) return
    setState({ userId, section })
  }, [])
  const closeUserAdmin = useCallback(() => setState(null), [])

  const value = useMemo(
    () => ({ openUserAdmin, closeUserAdmin, isOpen: !!state }),
    [openUserAdmin, closeUserAdmin, state]
  )

  return (
    <UserAdminModalContext.Provider value={value}>
      {children}
      {state && (
        <UserManagementCenter
          userId={state.userId}
          initialSection={state.section}
          onClose={closeUserAdmin}
        />
      )}
    </UserAdminModalContext.Provider>
  )
}
