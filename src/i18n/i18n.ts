import { ref, Ref } from 'vue'
import { Locale } from 'ant-design-vue/lib/vc-picker/interface'
import dayjs from 'dayjs'

import antd_en_US from 'ant-design-vue/es/locale/en_US'
import antd_ja_JP from 'ant-design-vue/es/locale/ja_JP'
import antd_zh_TW from 'ant-design-vue/es/locale/zh_TW'
import antd_zh_CN from 'ant-design-vue/es/locale/zh_CN'

import 'dayjs/locale/en'
import 'dayjs/locale/ja'
import 'dayjs/locale/zh-tw'
import 'dayjs/locale/zh-cn'

export type SupportedLocale = 'en_US' | 'ja_JP' | 'zh_HK' | 'zh_CN'
const SupportedLocales: SupportedLocale[] = [ 'en_US', 'ja_JP', 'zh_HK', 'zh_CN' ]

interface ObjectMap {
    [index: string]: Object
}

interface StringMap {
    [index: string]: string
}

const antdLocales: ObjectMap = {
    'en_US': antd_en_US,
    'ja_JP': antd_ja_JP,
    'zh_HK': antd_zh_TW,
    'zh_CN': antd_zh_CN
}

const dayJsLocales: StringMap = {
    'en_US': 'en',
    'ja_JP': 'ja',
    'zh_HK': 'zh-tw',
    'zh_CN': 'zh-cn'
}

const locale: Ref<SupportedLocale> = ref('en_US');

const setLocale = async (localeString: SupportedLocale): Promise<Locale> => {
    locale.value = localeString
    dayjs.locale(dayJsLocales[localeString])
    const ret = antdLocales[localeString] as Locale
    localStorage.setItem('locale', localeString)
    return ret
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
