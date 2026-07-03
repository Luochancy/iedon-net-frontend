<!--
*******************************************************************
components/LayoutHeader.vue

Copyright (C) 2024 iEdon
Copyright (C) 2026 Luochancy

This file is part of a project derived from iedon-net-frontend.
Modified by Luochancy on 2026-06.

Licensed under the GNU General Public License v3.0.
See the LICENSE file in the project root for details.
*******************************************************************
-->
<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import { locale, setLocale, SupportedLocales, getLocaleName, getLocaleCodeAlias } from '../i18n/i18n'
import { loggedIn, themeName, showSnackbar, siteConfig, applyTheme, isAdmin, manageSelectedTab } from '../common/helper'
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
const openLgPage = () => navigateTo('/lg')
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
        case 'health': selectedKeys.value = ['health']; break;
        case 'about': selectedKeys.value = ['about']; break;
        default: selectedKeys.value = [key]; break;
    }
}

const stopWatchPagePath = watch(() => router.currentRoute.value.path, () => setHeaderFocus())

const asn = ref('')
const person = ref('')
const gravatarUrl = ref('')
const getGravatar = (_email: string) => `${config.gravatarUrlPrefix}${md5(_email.trim().toLocaleLowerCase())}`

const stopWatchLoggedIn = watch(() => loggedIn.value, (newValue: boolean, oldValue: boolean) => {
    if (newValue) {
        asn.value = localStorage.getItem('asn') || ''
        person.value = localStorage.getItem('person') || ''
        const rawEmail = localStorage.getItem('email') || ''
        gravatarUrl.value = rawEmail.length !== 0 ? getGravatar(rawEmail) : ''
    }
    if (oldValue && !newValue) {
        if (location.href.startsWith('/signin') || location.href.startsWith('/openAuth')) return
        showSnackbar(t('pages.nodes.pleaseSignIn'), 'info')
        router.replace({ path: '/signin' })
    }
})

asn.value = localStorage.getItem('asn') || ''
person.value = localStorage.getItem('person') || ''
const initEmail = localStorage.getItem('email') || ''
gravatarUrl.value = initEmail.length !== 0 ? getGravatar(initEmail) : ''
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

const openHealthPage = () => navigateTo('/health')

const navItems = [
    { key: 'home', icon: 'mdi-home-outline', activeIcon: 'mdi-home', action: goHome },
    { key: 'nodes', icon: 'mdi-web', activeIcon: 'mdi-web', action: openNodesPage },
    { key: 'health', icon: 'mdi-heart-pulse', activeIcon: 'mdi-heart-pulse', action: openHealthPage },
    { key: 'lg', icon: 'mdi-magnify', activeIcon: 'mdi-magnify', action: openLgPage },
    { key: 'about', icon: 'mdi-information-outline', activeIcon: 'mdi-information', action: openAboutPage },
    { key: 'blog', icon: 'mdi-file-document-outline', activeIcon: 'mdi-file-document', action: openBlog },
]

const isOnManagePage = computed(() => router.currentRoute.value.path.startsWith('/manage'))

const manageNavItems = computed(() => {
    if (!isAdmin.value) {
        return [
            { key: 'mySessions', icon: 'mdi-link', label: t('pages.manage.mySessions') },
            { key: 'myAccount', icon: 'mdi-account', label: t('pages.manage.myAccount') },
        ]
    }
    return [
        { key: 'manageSessions', icon: 'mdi-link', label: t('pages.manage.manageSessions') },
        { key: 'manageNodes', icon: 'mdi-earth', label: t('pages.manage.manageNodes') },
        { key: 'manageConfig', icon: 'mdi-cog', label: t('pages.manage.manageConfig') },
        { key: 'myAccount', icon: 'mdi-account', label: t('pages.manage.myAccount') },
    ]
})

const selectManageTab = (key: string) => {
    manageSelectedTab.value = key
    if (!isOnManagePage.value) {
        router.replace({ path: '/manage' })
    }
    drawer.value = false
    window.scrollTo(0, 0)
}

const getNavLabel = (key: string) => {
    const map: Record<string, string> = {
        home: 'header.home',
        nodes: 'header.nodes',
        health: 'header.health',
        lg: 'header.lg',
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

            <!-- Manage sub-navigation items (shown when on /manage route) -->
            <template v-if="isOnManagePage && loggedIn">
                <v-divider class="my-2" />
                <v-list-item class="mb-1">
                    <v-list-item-title class="text-caption font-weight-bold text-medium-emphasis text-uppercase">
                        {{ t('header.manage') }}
                    </v-list-item-title>
                </v-list-item>
                <v-list-item
                    v-for="item in manageNavItems"
                    :key="`manage-${item.key}`"
                    :active="manageSelectedTab === item.key"
                    :prepend-icon="item.icon"
                    @click="selectManageTab(item.key)"
                    rounded="xl"
                    color="primary"
                >
                    <v-list-item-title>{{ item.label }}</v-list-item-title>
                </v-list-item>
            </template>
        </v-list>
    </v-navigation-drawer>

    <!-- MD3 Top App Bar -->
    <v-app-bar
        flat
        :color="themeName === 'dark' ? 'secondary' : 'secondary-container'"
        elevation="0"
        :height="64"
    >
        <!-- Logo (prepend slot) -->
        <template #prepend>
            <v-app-bar-nav-icon v-if="isMobile" @click="drawer = !drawer" variant="text" />
            <div v-if="!isMobile" class="d-flex align-center ml-2" style="cursor: pointer" @click="goHome">
                <v-img :src="logoSrc" :alt="logoAlt.header" height="36" width="auto" style="max-width: 160px" contain />
            </div>
        </template>

        <!-- Desktop Nav Items -->
        <template #default>
            <div v-if="!isMobile" class="d-flex align-center justify-center ga-2 flex-grow-1">
            <v-btn
                v-for="item in navItems"
                :key="item.key"
                variant="text"
                :color="selectedKeys.includes(item.key) ? '#eb9395' : undefined"
                :class="{ 'font-weight-bold': selectedKeys.includes(item.key) }"
                @click="item.action()"
                rounded="lg"
                size="small"
                class="px-3"
            >
                <v-icon start size="16">{{ selectedKeys.includes(item.key) ? item.activeIcon : item.icon }}</v-icon>
                {{ getNavLabel(item.key) }}
            </v-btn>
            </div>
        </template>

        <!-- Right Actions -->
        <template #append>
            <div class="d-flex align-center ga-1 mr-2" style="min-width: 80px; justify-content: flex-end;">
                <!-- Theme Toggle -->
                <v-btn variant="text" icon size="small" rounded="lg" @click="changeTheme">
                    <v-icon size="18">{{ themeName === 'light' ? 'mdi-weather-night' : 'mdi-white-balance-sunny' }}</v-icon>
                </v-btn>

                <!-- Language Selector (both mobile and desktop) -->
                <v-menu location="bottom end" :offset="12" :close-on-content-click="true" :transition="false" location-strategy="connected">
                    <template #activator="{ props: menuProps }">
                        <v-btn v-bind="menuProps" variant="text" size="small" rounded="lg" class="px-2">
                            <img :src="`${config.root}flags/${getLocaleCodeAlias(locale)}.svg`" width="18" height="14" style="border-radius: 2px" />
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
                <v-btn v-if="!loggedIn" variant="outlined" color="on-secondary" @click="login" rounded="lg" size="small" class="px-3">
                    <v-icon start size="16">mdi-login</v-icon>
                    <span v-if="!isMobile">{{ t('header.signIn') }}</span>
                </v-btn>
                <template v-else>
                    <v-btn variant="text" @click="redirectToManagePage" icon size="small" rounded="lg">
                        <v-avatar v-if="gravatarUrl.length !== 0" size="24">
                            <v-img :src="gravatarUrl" />
                        </v-avatar>
                        <v-avatar v-else-if="person.substring(0, 1)" size="24" color="primary">
                            <span class="text-caption font-weight-bold" style="color: white">{{ person.substring(0, 1) }}</span>
                        </v-avatar>
                        <v-avatar v-else size="24" color="surface-variant">
                            <v-icon size="14">mdi-account</v-icon>
                        </v-avatar>
                    </v-btn>
                    <v-dialog max-width="400">
                        <template #activator="{ props: dialogProps }">
                            <v-btn v-bind="dialogProps" variant="text" icon size="small" rounded="lg">
                                <v-icon size="18">mdi-logout</v-icon>
                            </v-btn>
                        </template>
                        <template #default="{ isActive }">
                            <v-card rounded="xl">
                                <v-card-title class="text-h6">{{ t('header.signOut') }}</v-card-title>
                                <v-card-text class="text-body-2 pb-2">{{ t('header.signOutConfirm') }}</v-card-text>
                                <v-card-actions>
                                    <v-spacer />
                                    <v-btn variant="text" @click="isActive.value = false" rounded="xl">{{ t('common.cancel') }}</v-btn>
                                    <v-btn color="error" variant="tonal" @click="signOut(); isActive.value = false" rounded="xl">{{ t('common.ok') }}</v-btn>
                                </v-card-actions>
                            </v-card>
                        </template>
                    </v-dialog>
                </template>
            </div>
        </template>
    </v-app-bar>
</template>
