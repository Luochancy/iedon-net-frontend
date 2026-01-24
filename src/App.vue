<script setup lang="ts">
import { onMounted, onUnmounted, Ref, ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Locale } from 'ant-design-vue/lib/vc-picker/interface'
import { theme as antTheme } from 'ant-design-vue'
import { locale, setLocale, SupportedLocale, SupportedLocales } from './i18n/i18n'
import LayoutHeader from './components/LayoutHeader.vue'
import LayoutContent from './components/LayoutContent.vue'
import LayoutFooter from './components/LayoutFooter.vue'
import { useHeartBeat, applyTheme, themeName, isValidTheme, THEME_STORAGE_KEY } from './common/helper'
import type { ThemeName } from './common/helper'
import { BulbFilled, BulbOutlined } from '@ant-design/icons-vue'
import { resolveAcceptLanguage } from 'resolve-accept-language'
import { siteInfo, openGraph } from './branding'

const vueI18n = useI18n()
const t = vueI18n.t

// Function to update meta tags based on current locale
const updateMetaTags = () => {
    try {
        const description = siteInfo.description
        const keywords = siteInfo.keywords
        const ogTitle = openGraph.title
        const ogSiteName = openGraph.siteName

        const html = document.querySelector('html')
        html?.setAttribute('lang', locale.value.replace('_', '-'))

        // Update meta description
        let metaDesc = document.querySelector('meta[name="description"]')
        if (metaDesc) {
            metaDesc.setAttribute('content', description)
        } else {
            metaDesc = document.createElement('meta')
            metaDesc.setAttribute('name', 'description')
            metaDesc.setAttribute('content', description)
            document.head.appendChild(metaDesc)
        }

        // Update meta keywords
        let metaKeywords = document.querySelector('meta[name="keywords"]')
        if (metaKeywords) {
            metaKeywords.setAttribute('content', keywords)
        } else {
            metaKeywords = document.createElement('meta')
            metaKeywords.setAttribute('name', 'keywords')
            metaKeywords.setAttribute('content', keywords)
            document.head.appendChild(metaKeywords)
        }

        // Update og:title
        let ogTitleMeta = document.querySelector('meta[property="og:title"]')
        if (ogTitleMeta) {
            ogTitleMeta.setAttribute('content', ogTitle)
        } else {
            ogTitleMeta = document.createElement('meta')
            ogTitleMeta.setAttribute('property', 'og:title')
            ogTitleMeta.setAttribute('content', ogTitle)
            document.head.appendChild(ogTitleMeta)
        }

        // Update og:description
        let ogDescMeta = document.querySelector('meta[property="og:description"]')
        if (ogDescMeta) {
            ogDescMeta.setAttribute('content', description)
        } else {
            ogDescMeta = document.createElement('meta')
            ogDescMeta.setAttribute('property', 'og:description')
            ogDescMeta.setAttribute('content', description)
            document.head.appendChild(ogDescMeta)
        }

        // Update og:site_name
        let ogSiteNameMeta = document.querySelector('meta[property="og:site_name"]')
        if (ogSiteNameMeta) {
            ogSiteNameMeta.setAttribute('content', ogSiteName)
        } else {
            ogSiteNameMeta = document.createElement('meta')
            ogSiteNameMeta.setAttribute('property', 'og:site_name')
            ogSiteNameMeta.setAttribute('content', ogSiteName)
            document.head.appendChild(ogSiteNameMeta)
        }

        // Update og:url
        let ogUrlMeta = document.querySelector('meta[property="og:url"]')
        if (ogUrlMeta && openGraph.url) {
            ogUrlMeta.setAttribute('content', openGraph.url)
        }

        // Update og:image
        // @ts-ignore
        if (openGraph.image) {
            let ogImageMeta = document.querySelector('meta[property="og:image"]')
            if (ogImageMeta) {
                // @ts-ignore
                ogImageMeta.setAttribute('content', openGraph.image)
            } else {
                ogImageMeta = document.createElement('meta')
                ogImageMeta.setAttribute('property', 'og:image')
                // @ts-ignore
                ogImageMeta.setAttribute('content', openGraph.image)
                document.head.appendChild(ogImageMeta)
            }
        }
    } catch (error) {
        console.error('Failed to update meta tags:', error)
    }
}

let stopHeartBeat: (() => void) | null = null
const antdLocale: Ref<Locale | null> = ref(null)

const stopWatchLocale = watch(
    (): SupportedLocale => locale.value,
    async (newLocale: SupportedLocale) => {
        vueI18n.locale.value = newLocale
        antdLocale.value = await setLocale(newLocale)
        // Update meta tags when locale changes
        updateMetaTags()
    },
    { immediate: true }
)

onMounted(async () => {
    let resolvedTheme: ThemeName = 'light'
    try {
        const storedTheme = localStorage.getItem(THEME_STORAGE_KEY)
        if (isValidTheme(storedTheme)) {
            resolvedTheme = storedTheme
        } else {
            const media = window.matchMedia('(prefers-color-scheme: dark)')
            resolvedTheme = media.matches ? 'dark' : 'light'
        }
    } catch (error) {
        console.warn('Failed to resolve theme preference, defaulting to light', error)
    }
    applyTheme(resolvedTheme, true)

    let targetLocale: SupportedLocale = 'en_US'
    const cachedLocale = localStorage.getItem('locale')
    
    if (cachedLocale && SupportedLocales.some(supported => cachedLocale === supported)) {
        targetLocale = cachedLocale as SupportedLocale
    } else {
        try {
            const browserLocale = resolveAcceptLanguage(
                navigator.language, 
                SupportedLocales.map(l => l.replace('_', '-')), 
                'en-US', 
                { returnMatchType: false }
            )
            targetLocale = browserLocale.replace('-', '_') as SupportedLocale
        } catch (error) {
            console.warn('Failed to resolve locale from navigator.languages, defaulting to en-US', error)
        }
    }
    
    // Load locale asynchronously to avoid blocking
    antdLocale.value = await setLocale(targetLocale)
    updateMetaTags()
    
    // Start heartbeat after everything is loaded
    stopHeartBeat = useHeartBeat(t)
    
    // Remove initial loading screen
    setTimeout(() => {
        const loadingEl = document.getElementById('initial-loading')
        if (loadingEl) {
            loadingEl.classList.add('fade-out')
            setTimeout(() => loadingEl.remove(), 500)
        }
    }, 100)
})

onUnmounted(() => {
    if (stopHeartBeat) stopHeartBeat()
    stopWatchLocale()
})

const themeTrigger = computed(() => themeName.value === 'light')

const changeTheme = () => {
    applyTheme(themeTrigger.value ? 'dark' : 'light', true)
}
</script>

<template>
    <a-config-provider :locale="antdLocale" :theme="{
        algorithm: themeName === 'dark' ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm
    }">
        <a-layout>
            <layout-header></layout-header>
            <layout-content></layout-content>
            <layout-footer></layout-footer>
            <a-float-button-group shape="circle" :style="{ right: '24px' }">
                <a-float-button @click="changeTheme">
                    <template #icon>
                        <bulb-outlined v-if="themeTrigger" />
                        <bulb-filled v-else />
                    </template>
                </a-float-button>
                <a-back-top :visibility-height="0" />
            </a-float-button-group>
        </a-layout>
    </a-config-provider>
</template>

<style>
html,
#app {
    width: 100%;
    height: 100%;
    user-select: none;
}

body {
    margin: 0;
}

/* Make layout fill viewport to push footer to bottom */
.ant-layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

.ant-layout-content {
    flex: 1;
}

/* Improved scroll behavior for SPA transitions */
* {
    box-sizing: border-box;
}

html {
    scroll-behavior: smooth;
}
</style>
