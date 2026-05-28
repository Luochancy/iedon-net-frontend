<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTheme } from 'vuetify'
import { locale, setLocale, SupportedLocale, SupportedLocales } from './i18n/i18n'
import LayoutHeader from './components/LayoutHeader.vue'
import LayoutContent from './components/LayoutContent.vue'
import LayoutFooter from './components/LayoutFooter.vue'
import { useHeartBeat, applyTheme, themeName, isValidTheme, THEME_STORAGE_KEY, snackbar } from './common/helper'
import type { ThemeName } from './common/helper'
import { resolveAcceptLanguage } from 'resolve-accept-language'
import { siteInfo, openGraph } from './branding'

const vueI18n = useI18n()
const t = vueI18n.t
const vuetifyTheme = useTheme()

const updateMetaTags = () => {
    try {
        const description = siteInfo.description
        const keywords = siteInfo.keywords
        const ogTitle = openGraph.title
        const ogSiteName = openGraph.siteName

        const html = document.querySelector('html')
        html?.setAttribute('lang', locale.value.replace('_', '-'))

        let metaDesc = document.querySelector('meta[name="description"]')
        if (metaDesc) {
            metaDesc.setAttribute('content', description)
        } else {
            metaDesc = document.createElement('meta')
            metaDesc.setAttribute('name', 'description')
            metaDesc.setAttribute('content', description)
            document.head.appendChild(metaDesc)
        }

        let metaKeywords = document.querySelector('meta[name="keywords"]')
        if (metaKeywords) {
            metaKeywords.setAttribute('content', keywords)
        } else {
            metaKeywords = document.createElement('meta')
            metaKeywords.setAttribute('name', 'keywords')
            metaKeywords.setAttribute('content', keywords)
            document.head.appendChild(metaKeywords)
        }

        let ogTitleMeta = document.querySelector('meta[property="og:title"]')
        if (ogTitleMeta) {
            ogTitleMeta.setAttribute('content', ogTitle)
        } else {
            ogTitleMeta = document.createElement('meta')
            ogTitleMeta.setAttribute('property', 'og:title')
            ogTitleMeta.setAttribute('content', ogTitle)
            document.head.appendChild(ogTitleMeta)
        }

        let ogDescMeta = document.querySelector('meta[property="og:description"]')
        if (ogDescMeta) {
            ogDescMeta.setAttribute('content', description)
        } else {
            ogDescMeta = document.createElement('meta')
            ogDescMeta.setAttribute('property', 'og:description')
            ogDescMeta.setAttribute('content', description)
            document.head.appendChild(ogDescMeta)
        }

        let ogSiteNameMeta = document.querySelector('meta[property="og:site_name"]')
        if (ogSiteNameMeta) {
            ogSiteNameMeta.setAttribute('content', ogSiteName)
        } else {
            ogSiteNameMeta = document.createElement('meta')
            ogSiteNameMeta.setAttribute('property', 'og:site_name')
            ogSiteNameMeta.setAttribute('content', ogSiteName)
            document.head.appendChild(ogSiteNameMeta)
        }

        let ogUrlMeta = document.querySelector('meta[property="og:url"]')
        if (ogUrlMeta && openGraph.url) {
            ogUrlMeta.setAttribute('content', openGraph.url)
        }

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

const stopWatchLocale = watch(
    (): SupportedLocale => locale.value,
    async (newLocale: SupportedLocale) => {
        vueI18n.locale.value = newLocale
        await setLocale(newLocale)
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
    vuetifyTheme.global.name.value = resolvedTheme === 'dark' ? 'luocynetDark' : 'luocynetLight'

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
    
    await setLocale(targetLocale)
    updateMetaTags()
    
    stopHeartBeat = useHeartBeat(t)
})

onUnmounted(() => {
    if (stopHeartBeat) stopHeartBeat()
    stopWatchLocale()
})
</script>

<template>
    <v-app>
        <layout-header />
        <v-main>
            <layout-content />
        </v-main>
        <layout-footer />

        <!-- MD3 Global Snackbar with disconnect detection -->
        <v-snackbar
            v-model="snackbar.show"
            :timeout="snackbar.timeout"
            :color="snackbar.color"
            location="bottom end"
            rounded="lg"
            elevation="6"
        >
            <div class="d-flex align-center">
                <v-icon v-if="snackbar.color === 'error'" start size="20" class="mr-2">mdi-alert-circle-outline</v-icon>
                <v-icon v-else-if="snackbar.color === 'success'" start size="20" class="mr-2">mdi-check-circle-outline</v-icon>
                <v-icon v-else-if="snackbar.color === 'warning'" start size="20" class="mr-2">mdi-alert-outline</v-icon>
                <v-icon v-else start size="20" class="mr-2">mdi-information-outline</v-icon>
                {{ snackbar.text }}
            </div>
            <template #actions>
                <v-btn variant="text" @click="snackbar.show = false" size="small" icon="mdi-close" />
            </template>
        </v-snackbar>
    </v-app>
</template>

<style>
html,
#app {
    width: 100%;
    height: 100%;
}

body {
    margin: 0;
}

* {
    box-sizing: border-box;
}

/* MD3 typography: global smooth font rendering */
body {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}
</style>
