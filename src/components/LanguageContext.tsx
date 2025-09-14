'use client'

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { initReactI18next } from 'react-i18next'
import i18n from 'i18next'

// Import all translations
import enCommon from '../../public/locales/en/common.json'
import enAuth from '../../public/locales/en/auth.json'
import enBooking from '../../public/locales/en/booking.json'
import enAccount from '../../public/locales/en/account.json'
import enPayment from '../../public/locales/en/payment.json'
import enAdmin from '../../public/locales/en/admin.json'

import siCommon from '../../public/locales/si/common.json'
import siAuth from '../../public/locales/si/auth.json'
import siBooking from '../../public/locales/si/booking.json'
import siAccount from '../../public/locales/si/account.json'
import siPayment from '../../public/locales/si/payment.json'
import siAdmin from '../../public/locales/si/admin.json'

type Language = 'en' | 'si'

interface LanguageState {
  currentLanguage: Language
  isInitialized: boolean
}

type LanguageAction =
  | { type: 'SET_LANGUAGE'; payload: Language }
  | { type: 'SET_INITIALIZED'; payload: boolean }

interface LanguageContextType extends LanguageState {
  changeLanguage: (language: Language) => void
  t: (key: string, options?: any) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const initialState: LanguageState = {
  currentLanguage: 'en',
  isInitialized: false,
}

function languageReducer(state: LanguageState, action: LanguageAction): LanguageState {
  switch (action.type) {
    case 'SET_LANGUAGE':
      return { ...state, currentLanguage: action.payload }
    case 'SET_INITIALIZED':
      return { ...state, isInitialized: action.payload }
    default:
      return state
  }
}

// Initialize i18n
i18n
  .use(initReactI18next)
  .init({
    lng: 'en', // Default language
    fallbackLng: 'en',
    
    resources: {
      en: {
        common: enCommon,
        auth: enAuth,
        booking: enBooking,
        account: enAccount,
        payment: enPayment,
        admin: enAdmin,
      },
      si: {
        common: siCommon,
        auth: siAuth,
        booking: siBooking,
        account: siAccount,
        payment: siPayment,
        admin: siAdmin,
      },
    },

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    // Enable namespace usage
    ns: ['common', 'auth', 'booking', 'account', 'payment', 'admin'],
    defaultNS: 'common',
  })

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(languageReducer, initialState)
  const { t, i18n: i18nInstance } = useTranslation()

  // Load saved language preference on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('preferred-language') as Language
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'si')) {
      i18nInstance.changeLanguage(savedLanguage)
      dispatch({ type: 'SET_LANGUAGE', payload: savedLanguage })
    }
    dispatch({ type: 'SET_INITIALIZED', payload: true })
  }, [i18nInstance])

  const changeLanguage = (language: Language) => {
    i18nInstance.changeLanguage(language)
    localStorage.setItem('preferred-language', language)
    dispatch({ type: 'SET_LANGUAGE', payload: language })
    
    // Update html lang attribute for accessibility
    document.documentElement.lang = language
  }

  return (
    <LanguageContext.Provider
      value={{
        ...state,
        changeLanguage,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

// Export Language type for use in other components
export type { Language }