import { createContext } from 'react'
import type { SesionCorporativa } from './types'

export const AuthContext = createContext<SesionCorporativa | null>(null)
