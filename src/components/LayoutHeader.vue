<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import { locale, setLocale, SupportedLocales, getLocaleName, getLocaleCodeAlias } from '../i18n/i18n'
import { loggedIn, themeName, showSnackbar, siteConfig, applyTheme } from '../common/helper'
import config from "../config"
import { logos, logoAlt } from '../branding'

//@ts-ignore
import md5 from 'md5'

const t = useI18n().t

const selectedKeys = ref<string[]>(['home'])
const drawer = ref(false)

const router = useRouter()
const navigateTo = (path: string) => {
    router.replace({ path })
    window.scrollTo(0, 0)
    drawer.value = false
}

const goHome = () => navigateTo('/')
const openNodesPage = () => navigateTo('/nodes')
const openSigninPage = () => navigateTo('/signin')
const openAboutPage = () => navigateTo('/about')
const openBlog = () => {
    window.location.href = 'https://www.luochancy.com'
}

const signOut = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('asn')
    localStorage.removeItem('person')
    localStorage.removeItem('email')
    loggedIn.value = false
    window.location.href = '/'
    window.scrollTo(0, 0)
}

const setHeaderFocus = () => {
    const path = router.currentRoute.value.path
    const key = path.split('/')[1] || path
    switch (key) {
        case 'home': case '/': selectedKeys.value = ['home']; break;
        case 'nodes': selectedKeys.value = ['nodes']; break;
        case 'about': selectedKeys.value = ['about']; break;
        default: selectedKeys.value = [key]; break;
    }
}

const stopWatchPagePath = watch(() => router.currentRoute.value.path, () => setHeaderFocus())

const asn = ref('')
const person = ref('')
const email = ref('')
const getGravatar = (_email: string) => `${config.gravatarUrlPrefix}${md5(_email.trim().toLocaleLowerCase())}`

const stopWatchLoggedIn = watch(() => loggedIn.value, (newValue: boolean, oldValue: boolean) => {
    if (newValue) {
        asn.value = localStorage.getItem('asn') || ''
        person.value = localStorage.getItem('person') || ''
        email.value = localStorage.getItem('email') || ''
        if (email.value.length !== 0) email.value = getGravatar(email.value)
    }
    if (oldValue && !newValue) {
        if (location.href.startsWith('/signin') || location.href.startsWith('/openAuth')) return
        showSnackbar(t('pages.nodes.pleaseSignIn'), 'info')
        router.replace({ path: '/signin' })
    }
})

asn.value = localStorage.getItem('asn') || ''
person.value = localStorage.getItem('person') || ''
email.value = localStorage.getItem('email') || ''
if (email.value.length !== 0) email.value = getGravatar(email.value)
if (asn.value && person.value && localStorage.getItem('token')) loggedIn.value = true

const logoSrc = computed(() => themeName.value === 'dark' ? logos.dark : logos.light)
const siteName = computed(() => siteConfig.value.netName || 'iEdon')

const isMobile = ref(window.innerWidth < 960)
const handleResize = () => {
    isMobile.value = window.innerWidth < 960
}

// Theme toggle
const vuetifyTheme = useTheme()
const changeTheme = () => {
    const newTheme = themeName.value === 'light' ? 'dark' : 'light'
    applyTheme(newTheme, true)
    vuetifyTheme.global.name.value = newTheme === 'dark' ? 'luocynetDark' : 'luocynetLight'
}

onMounted(() => {
    setHeaderFocus()
    window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
    stopWatchPagePath()
    stopWatchLoggedIn()
    window.removeEventListener('resize', handleResize)
})

const redirectToManagePage = () => {
    router.replace({ path: '/manage' })
}

const login = () => {
    if (!loggedIn.value) {
        openSigninPage()
        return
    }
    redirectToManagePage()
}

const navItems = [
    { key: 'home', icon: 'mdi-home-outline', activeIcon: 'mdi-home', action: goHome },
    { key: 'nodes', icon: 'mdi-web', activeIcon: 'mdi-web', action: openNodesPage },
    { key: 'about', icon: 'mdi-information-outline', activeIcon: 'mdi-information', action: openAboutPage },
    { key: 'blog', icon: 'mdi-file-document-outline', activeIcon: 'mdi-file-document', action: openBlog },
]

const getNavLabel = (key: string) => {
    const map: Record<string, string> = {
        home: 'header.home',
        nodes: 'header.nodes',
        about: 'header.about',
        blog: 'header.blog',
    }
    return t(map[key] || key)
}
</script>

<template>
    <!-- Mobile Navigation Drawer -->
    <v-navigation-drawer
        v-model="drawer"
        temporary
        location="start"
        color="surface"
        width="280"
    >
        <v-list nav density="comfortable" class="pa-2">
            <v-list-item class="mb-2">
                <v-list-item-title class="text-subtitle-1 font-weight-bold">
                    {{ siteName }}
                </v-list-item-title>
            </v-list-item>

            <v-divider class="mb-2" />

            <v-list-item
                v-for="item in navItems"
                :key="item.key"
                :active="selectedKeys.includes(item.key)"
                :prepend-icon="selectedKeys.includes(item.key) ? item.activeIcon : item.icon"
                @click="item.action()"
                rounded="xl"
                color="primary"
            >
                <v-list-item-title>{{ getNavLabel(item.key) }}</v-list-item-title>
            </v-list-item>
        </v-list>
    </v-navigation-drawer>

    <!-- MD3 Top App Bar -->
    <v-app-bar
        flat
        color="surface"
        elevation="0"
        :height="64"
        style="position: fixed; border-bottom: thin solid rgba(var(--v-border-color), var(--v-border-opacity))"
    >
        <!-- Logo (prepend slot) -->
        <template #prepend>
            <v-app-bar-nav-icon v-if="isMobile" @click="drawer = !drawer" variant="text" />
            <div v-if="!isMobile" class="d-flex align-center ml-2" style="cursor: pointer" @click="goHome">
                <v-img :src="logoSrc" :alt="logoAlt.header" height="36" width="auto" style="max-width: 160px" contain />
            </div>
        </template>

        <!-- Desktop Nav Items -->
        <div v-if="!isMobile" class="d-flex align-center mx-auto ga-1">
            <v-btn
                v-for="item in navItems"
                :key="item.key"
                variant="text"
                :color="selectedKeys.includes(item.key) ? 'primary' : undefined"
                :class="{ 'font-weight-bold': selectedKeys.includes(item.key) }"
                @click="item.action()"
                rounded="xl"
                size="default"
            >
                <v-icon start size="18">{{ selectedKeys.includes(item.key) ? item.activeIcon : item.icon }}</v-icon>
                {{ getNavLabel(item.key) }}
            </v-btn>
        </div>

        <!-- Right Actions -->
        <template #append>
            <div class="d-flex align-center ga-2 mr-2">
                <!-- Theme Toggle -->
                <v-btn variant="text" icon size="small" @click="changeTheme">
                    <v-icon size="20">{{ themeName === 'light' ? 'mdi-weather-night' : 'mdi-white-balance-sunny' }}</v-icon>
                </v-btn>

                <!-- Language Selector (both mobile and desktop) -->
                <v-menu location="bottom end" :offset="8">
                    <template #activator="{ props: menuProps }">
                        <v-btn v-bind="menuProps" variant="text" size="small" rounded="xl">
                            <img :src="`${config.root}flags/${getLocaleCodeAlias(locale)}.svg`" width="20" height="14" style="border-radius: 2px" />
                        </v-btn>
                    </template>
                    <v-list density="compact" rounded="xl" elevation="3" width="200">
                        <v-list-item
                            v-for="_locale in SupportedLocales"
                            :key="`lang-${_locale}`"
                            @click="setLocale(_locale)"
                            :active="_locale === locale"
                            rounded="lg"
                            color="primary"
                        >
                            <template #prepend>
                                <img :src="`${config.root}flags/${getLocaleCodeAlias(_locale)}.svg`" width="20" height="14" class="mr-3" style="border-radius: 2px" />
                            </template>
                            <v-list-item-title>{{ getLocaleName(_locale) }}</v-list-item-title>
                            <template #append v-if="_locale === locale">
                                <v-icon size="16" color="primary">mdi-check</v-icon>
                            </template>
                        </v-list-item>
                    </v-list>
                </v-menu>

                <!-- Sign In / Profile -->
                <v-btn v-if="!loggedIn" variant="tonal" color="primary" @click="login" rounded="xl" size="small">
                    <v-icon start size="18">mdi-login</v-icon>
                    <span v-if="!isMobile">{{ t('header.signIn') }}</span>
                </v-btn>
                <template v-else>
                    <v-btn variant="text" @click="redirectToManagePage" rounded="xl" size="small" class="text-none">
                        <v-avatar v-if="email.length !== 0" size="28" class="mr-2">
                            <v-img :src="email" />
                        </v-avatar>
                        <v-avatar v-else-if="person.substring(0, 1)" size="28" color="primary" class="mr-2">
                            <span class="text-caption font-weight-bold" style="color: white">{{ person.substring(0, 1) }}</span>
                        </v-avatar>
                        <v-avatar v-else size="28" color="surface-variant" class="mr-2">
                            <v-icon size="16">mdi-account</v-icon>
                        </v-avatar>
                        <span v-if="!isMobile" class="text-body-2">{{ person || asn }}</span>
                    </v-btn>
                    <v-dialog max-width="360">
                        <template #activator="{ props: dialogProps }">
                            <v-btn v-bind="dialogProps" variant="text" icon size="small" color="error">
                                <v-icon size="20">mdi-logout</v-icon>
                            </v-btn>
                        </template>
                        <template #default="{ isActive }">
                            <v-card rounded="xl">
                                <v-card-title class="text-h6">{{ t('header.signOut') }}</v-card-title>
                                <v-card-text class="text-body-2 pb-2">{{ t('header.signOutConfirm') }}</v-card-text>
                                <v-card-actions>
                                    <v-spacer />
                                    <v-btn variant="text" @click="isActive.value = false" rounded="xl">Cancel</v-btn>
                                    <v-btn color="error" variant="tonal" @click="signOut(); isActive.value = false" rounded="xl">OK</v-btn>
                                </v-card-actions>
                            </v-card>
                        </template>
                    </v-dialog>
                </template>
            </div>
        </template>
    </v-app-bar>
</template>
