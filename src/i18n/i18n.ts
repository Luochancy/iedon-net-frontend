/*
*******************************************************************
i18n/i18n.ts

Copyright (C) 2024 iEdon
Copyright (C) 2026 Luochancy

This file is part of a project derived from iedon-net-frontend.
Modified by Luochancy on 2026-06.

Licensed under the GNU General Public License v3.0.
See the LICENSE file in the project root for details.
*******************************************************************
*/
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'

import 'dayjs/locale/en'
import 'dayjs/locale/ja'
import 'dayjs/locale/zh-tw'
import 'dayjs/locale/zh-cn'

export type SupportedLocale = 'en_US' | 'ja_JP' | 'zh_HK' | 'zh_CN'

export const SupportedLocales: SupportedLocale[] = ['en_US', 'ja_JP', 'zh_HK', 'zh_CN']

const dayJsLocales: Record<SupportedLocale, string> = {
    'en_US': 'en',
    'ja_JP': 'ja',
    'zh_HK': 'zh-tw',
    'zh_CN': 'zh-cn'
}

const localeNames: Record<SupportedLocale, string> = {
    'en_US': 'English',
    'ja_JP': '日本語 (Japanese)',
    'zh_HK': '繁體中文 (香港)',
    'zh_CN': '简体中文 (Simplified Chinese)'
}

const localeCodes: Record<SupportedLocale, string> = {
    'en_US': 'us',
    'ja_JP': 'jp',
    'zh_HK': 'hk',
    'zh_CN': 'cn'
}

export const getLocaleName = (locale: SupportedLocale): string => localeNames[locale]

export const getLocaleCodeAlias = (locale: SupportedLocale): string => localeCodes[locale]

export const setLocale = (localeString: SupportedLocale): void => {
    dayjs.locale(dayJsLocales[localeString])
    localStorage.setItem('locale', localeString)
}

export const initLocale = (): SupportedLocale => {
    const stored = localStorage.getItem('locale')

    // zh_TW legacy migration
    if (stored === 'zh_TW' || stored === 'zh_TW') {
        localStorage.setItem('locale', 'zh_HK')
        return 'zh_HK'
    }

    if (stored && SupportedLocales.includes(stored as SupportedLocale)) {
        return stored as SupportedLocale
    }

    // Browser auto-detect
    const browserLang = navigator.language.toLowerCase()
    if (browserLang.startsWith('zh')) {
        return browserLang.includes('tw') || browserLang.includes('hk') ? 'zh_HK' : 'zh_CN'
    }
    if (browserLang.startsWith('ja')) return 'ja_JP'
    return 'en_US'
}
