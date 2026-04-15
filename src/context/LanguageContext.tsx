import { createContext, useContext, useState, useCallback } from 'react'
import { TRANSLATIONS, type Lang, type TranslationKey } from '@/lib/i18n'
import { storage } from '@/lib/storage'

interface LanguageContextValue {
  lang: Lang
  toggleLang: () => void
  t: (key: TranslationKey) => string
  dir: 'rtl' | 'ltr'
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(() =>
    storage.get<Lang>('ui-lang', 'ar')
  )

  const toggleLang = useCallback(() => {
    setLang(prev => {
      const next = prev === 'ar' ? 'en' : 'ar'
      storage.set('ui-lang', next)
      return next
    })
  }, [])

  const t = useCallback((key: TranslationKey): string => {
    return TRANSLATIONS[lang][key] ?? TRANSLATIONS.ar[key] ?? key
  }, [lang])

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t, dir: lang === 'ar' ? 'rtl' : 'ltr' }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}

// Helper: get branch display name based on current language
export function useBranchName() {
  const { lang } = useLanguage()
  return (branch: { storeName: string; storeNameAr?: string }) =>
    lang === 'ar' ? (branch.storeNameAr || branch.storeName) : branch.storeName
}

// Helper: get employee display name based on current language
export function useEmpName() {
  const { lang } = useLanguage()
  return (emp: { name: string; nameEn: string; domainName?: string; user: string }) =>
    lang === 'en'
      ? (emp.nameEn || emp.domainName || emp.user)
      : (emp.name || emp.nameEn || emp.domainName || emp.user)
}
