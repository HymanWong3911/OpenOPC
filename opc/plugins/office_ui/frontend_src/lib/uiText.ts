import { useCallback } from 'react'
import { useI18n } from '../i18n'

export type UiText = (english: string, chinese: string) => string

/** Small component copy uses the same locale as the main message catalog. */
export function useUiText(): UiText {
  const { locale } = useI18n()
  return useCallback((english, chinese) => locale === 'zh-CN' ? chinese : english, [locale])
}
