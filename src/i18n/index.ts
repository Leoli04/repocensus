import { ref, watch } from 'vue'
import zh from './zh'
import en from './en'

export type Lang = 'zh' | 'en'
type Dict = Record<string, string>

const messages: Record<Lang, Dict> = { zh, en }
const STORAGE_KEY = 'repocensus:lang'

function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'zh' || saved === 'en') return saved
  } catch {
    /* ignore */
  }
  const nav = (typeof navigator !== 'undefined' ? navigator.language : 'zh').toLowerCase()
  return nav.startsWith('zh') ? 'zh' : 'en'
}

// Module-level reactive locale shared across all components
const locale = ref<Lang>(detectLang())

/**
 * Translate a key. Supports `{param}` interpolation.
 * Falls back to zh then to the raw key if missing.
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const dict = messages[locale.value] ?? messages.zh
  let s: string = dict[key] ?? messages.zh[key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    }
  }
  return s
}

// Persist + reflect on <html lang>
watch(
  locale,
  (l) => {
    try {
      localStorage.setItem(STORAGE_KEY, l)
      if (typeof document !== 'undefined') document.documentElement.setAttribute('lang', l)
    } catch {
      /* ignore */
    }
  },
  { immediate: true }
)

/**
 * Translate a category name (data-driven, originally Chinese).
 * Falls back to the raw name if no translation exists.
 */
export function catLabel(name: string): string {
  return t(`cat.${name}`)
}

/**
 * Translate a template name (data-driven, originally Chinese).
 * Falls back to the raw name if no translation exists.
 */
export function tplLabel(name: string): string {
  return t(`tpl.${name}`)
}

export function useI18n() {
  function setLocale(l: Lang) {
    locale.value = l
  }
  function toggleLocale() {
    locale.value = locale.value === 'zh' ? 'en' : 'zh'
  }
  return { t, locale, setLocale, toggleLocale, catLabel, tplLabel }
}
