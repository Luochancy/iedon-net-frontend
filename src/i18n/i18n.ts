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
import { ref, Ref } from 'vue'
import dayjs from 'dayjs'

import 'dayjs/locale/en'
import 'dayjs/locale/ja'
import 'dayjs/locale/zh-tw'
import 'dayjs/locale/zh-cn'

export type SupportedLocale = 'en_US' | 'ja_JP' | 'zh_HK' | 'zh_CN'
const SupportedLocales: SupportedLocale[] = [ 'en_US', 'ja_JP', 'zh_HK', 'zh_CN' ]

const dayJsLocales: Record<string, string> = {
    'en_US': 'en',
    'ja_JP': 'ja',
    'zh_HK': 'zh-tw',
    'zh_CN': 'zh-cn'
}

const locale: Ref<SupportedLocale> = ref('en_US');

const setLocale = async (localeString: SupportedLocale): Promise<void> => {
    locale.value = localeString
    dayjs.locale(dayJsLocales[localeString])
    localStorage.setItem('locale', localeString)
}

const getLocaleName = (locale: SupportedLocale) => {
    switch (locale) {
        case 'en_US': default: return 'English'
        case 'ja_JP': return '日本語 (Japanese)'
        case 'zh_HK': return '繁體中文 (香港)'
        case 'zh_CN': return '简体中文 (Simplified Chinese)'
    }
}

const getLocaleCodeAlias = (locale: SupportedLocale) => {
    switch (locale) {
        case 'en_US': default: return 'us'
        case 'ja_JP': return 'jp'
        case 'zh_HK': return 'hk'
        case 'zh_CN': return 'cn'
    }
}

// Browser language detection
if (!localStorage.getItem('locale')) {
    const browserLang = navigator.language.toLowerCase()
    if (browserLang.startsWith('zh')) {
        if (browserLang.includes('tw') || browserLang.includes('hk')) {
            setLocale('zh_HK')
        } else {
            setLocale('zh_CN')
        }
    } else if (browserLang.startsWith('ja')) {
        setLocale('ja_JP')
    } else {
        setLocale('en_US')
    }
} else {
    const storedLocale = localStorage.getItem('locale')
    if (storedLocale === 'zh_TW') {
        localStorage.setItem('locale', 'zh_HK')
        setLocale('zh_HK')
    } else if (storedLocale) {
        setLocale(storedLocale as SupportedLocale)
    }
}

export {
    SupportedLocales,
    locale,
    setLocale,
    getLocaleName,
    getLocaleCodeAlias
}
