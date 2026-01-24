<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { UserOutlined, HomeOutlined, LoginOutlined, GlobalOutlined, LogoutOutlined, BookOutlined, StarFilled, InfoCircleOutlined, ProfileOutlined } from '@ant-design/icons-vue'
import { locale, setLocale, SupportedLocales, getLocaleName, getLocaleCodeAlias } from '../i18n/i18n'
import { loggedIn, themeName } from '../common/helper'
import config from "../config"
import { logos, logoAlt, logoSizes } from '../branding'

import { message } from 'ant-design-vue'

//@ts-ignore
import md5 from 'md5'


const t = useI18n().t

const selectedKeys = ref<string[]>(['home'])
const rightMenuSelectedKeys = ref<string[]>([])

// Force menu re-render key
const menuRerenderKey = ref(0)

const router = useRouter()
const goHome = () => {
    router.replace({ path: '/' })
    window.scrollTo(0, 0)
}
const openNodesPage = () => {
    router.replace({ path: '/nodes' })
    window.scrollTo(0, 0)
}

const openSigninPage = () => {
    router.replace({ path: '/signin' })
    window.scrollTo(0, 0)
}

const openAboutPage = () => {
    router.replace({ path: '/about' })
    window.scrollTo(0, 0)
}

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

const stopWatchPagePath = watch(() => router.currentRoute.value.path, (newValue: string) => setHeaderFocus())
const onSelect = (menuInfo: { item: HTMLElement, key: string, selectedKeys: string[] }) => {
    setHeaderFocus()
}

const onRightMenuSelect = (menuInfo: { item: HTMLElement, key: string, selectedKeys: string[] }) => {
    // Handle right menu selections separately
    // Language and login actions don't need to maintain selection state
    rightMenuSelectedKeys.value = []
}

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
        message.info(t('pages.nodes.pleaseSignIn'))
        router.replace({ path: '/signin' })
    }
})

asn.value = localStorage.getItem('asn') || ''
person.value = localStorage.getItem('person') || ''
email.value = localStorage.getItem('email') || ''
if (email.value.length !== 0) email.value = getGravatar(email.value)
if (asn.value && person.value && localStorage.getItem('token')) loggedIn.value = true

const logoSrc = computed(() => {
    return themeName.value === 'dark' ? logos.dark : logos.light
})

// Handle window resize to force menu recalculation
let resizeTimeout: number | null = null
const handleResize = () => {
    // Debounce resize events to avoid excessive re-renders
    if (resizeTimeout) {
        clearTimeout(resizeTimeout)
    }
    resizeTimeout = setTimeout(() => {
        // Force re-render of menus on resize to recalculate layout
        menuRerenderKey.value++
    }, 150)
}

// Fetch posts on component mount
onMounted(() => {
    setHeaderFocus() // Initialize header focus based on current route

    // Add resize listener
    window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
    stopWatchPagePath()
    stopWatchLoggedIn()

    // Clean up timeout
    if (resizeTimeout) {
        clearTimeout(resizeTimeout)
    }

    // Remove resize listener
    window.removeEventListener('resize', handleResize)
})

const redirectToManagePage = () => {
    router.replace({
        path: '/manage'
    })
}

const login = () => {
    if (!loggedIn.value) {
        openSigninPage()
        return
    }
    redirectToManagePage()
}
</script>

<template>
    <a-layout-header id="header" :class="themeName">
        <img class="logo" :src="logoSrc" @click="goHome" :alt="logoAlt.header" />
        <div class="menus">
            <a-menu :class="`menu ${themeName}`" @select="onSelect" :theme="themeName" mode="horizontal"
                v-model:selectedKeys="selectedKeys" :key="`left-menu-${menuRerenderKey}`">
                <a-menu-item key="home" @click="goHome">
                    <template #icon>
                        <home-outlined />
                    </template>
                    {{ t('header.home') }}
                </a-menu-item>
                <a-menu-item key="nodes" @click="openNodesPage">
                    <template #icon>
                        <global-outlined />
                    </template>
                    {{ t('header.nodes') }}
                </a-menu-item>
                <a-menu-item key="about" @click="openAboutPage">
                    <template #icon>
                        <info-circle-outlined />
                    </template>
                    {{ t('header.about') }}
                </a-menu-item>
                <a-menu-item key="blog" @click="openBlog">
                    <template #icon>
                        <profile-outlined />
                    </template>
                    {{ t('header.blog') }}
                </a-menu-item>
            </a-menu>
            <a-menu :class="`menu ${themeName}`" @select="onRightMenuSelect" :theme="themeName" mode="horizontal"
                v-model:selectedKeys="rightMenuSelectedKeys"
                :key="`right-menu-${loggedIn ? 'logged' : 'guest'}-${locale}-${menuRerenderKey}`">
                <a-sub-menu key="language">
                    <template #title>
                        <img :src="`${config.root}flags/${getLocaleCodeAlias(locale)}.svg`" width="16" class="flag" />
                    </template>
                    <a-menu-item-group title="Choose language of your region...">
                        <a-menu-item v-for="_locale in SupportedLocales" :key="`lang_${_locale}`"
                            @click="setLocale(_locale)" :class="{ 'selected-language': _locale === locale }">
                            <template #icon>
                                <img :src="`${config.root}flags/${getLocaleCodeAlias(_locale)}.svg`" width="16"
                                    class="flag" />
                            </template>
                            <span class="language-name">{{ getLocaleName(_locale) }}</span>
                            <star-filled v-if="_locale === locale" class="selected-indicator" />
                        </a-menu-item>
                    </a-menu-item-group>
                </a-sub-menu>
                <a-menu-item key="login" @click="login">
                    <div class="signBox">
                        <a-button v-if="!loggedIn" type="dashed">
                            <template #icon>
                                <login-outlined />
                            </template>
                            {{ t('header.signIn') }}
                        </a-button>
                        <template v-else>
                            <a-avatar class="avatar" v-if="email.length !== 0" :src="email"></a-avatar>
                            <a-avatar class="avatar"
                                v-else-if="person.substring(0, 1) || asn.substring(asn.length - 4 - 1)">{{
                                    person.substring(0, 1) || asn.substring(asn.length - 4 - 1) }}</a-avatar>
                            <a-avatar class="avatar" v-else>
                                <template #icon>
                                    <user-outlined />
                                </template>
                            </a-avatar>
                            <span class="name">{{ person || asn }}</span>
                            <a-popconfirm @click="(event: Event) => event.stopPropagation()" placement="bottomRight"
                                :title="t('header.signOutConfirm')" @confirm="signOut">
                                <a-button type="dashed">
                                    <template #icon>
                                        <logout-outlined />
                                    </template>
                                    {{ t('header.signOut') }}
                                </a-button>
                            </a-popconfirm>
                        </template>
                    </div>
                </a-menu-item>
            </a-menu>
        </div>
    </a-layout-header>
</template>

<style scoped>
#header {
    position: fixed;
    width: 100%;
    z-index: 100;
    opacity: 0.95;
    height: 64px;
    display: flex;
}

#header.light {
    background-color: #fff;
    box-shadow: 0 2px 8px #f0f1f2;
}

#header.dark {
    background-color: #111;
    box-shadow: 0 2px 8px #161616;
}

#header.dark .logo {
    filter: invert(1) brightness(2);
}

.menu.dark {
    background-color: #111;
}

@media (min-width: 0px) and (max-width: 992px
    /* lg */
) {
    #header {
        padding: 0 15px !important;
    }

    #header .logo {
        height: 2.5rem !important;
        width: auto !important;
        margin-right: 15px !important;
    }
}

@media (min-width: 0px) and (max-width: 768px
    /* md */
) {
    #header .logo {
        height: 2.1rem !important;
        width: auto !important;
        margin-right: 10px !important;
    }

    #header:deep(.menu:first-child .ant-menu-item-group-title) {
        display: none;
    }

    #header:deep(.menu:first-child .ant-menu-submenu-title) {
        padding: 0 8px !important;
    }

    #header:deep(.menu:last-child .ant-menu-item) {
        padding: 0 8px !important;
    }
}

@media (min-width: 0px) and (max-width: 576px
    /* sm */
) {
    #header .logo {
        height: 1.8rem !important;
        width: auto !important;
        margin-right: 8px !important;
    }

    #header:deep(.menu:first-child .ant-menu-submenu-title) {
        padding: 0 4px !important;
        font-size: 12px !important;
    }

    #header:deep(.menu:last-child) {
        min-width: auto;
    }

    .signBox span.name {
        display: none !important;
    }

    .signBox .avatar {
        margin-right: 10px;
    }
}

#header .logo {
    height: 2.8rem;
    width: auto;
    margin-right: 30px;
    cursor: pointer;
    object-fit: contain;
    align-self: center;
    display: block;
}

#header .menus {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    min-width: 0;
}

#header:deep(.menu) {
    border-bottom: none;
    min-width: 0;
}

#header:deep(.menu:first-child) {
    flex: 1;
    min-width: 0;
    max-width: none;
    overflow: hidden;
}

#header:deep(.menu:first-child .ant-menu) {
    overflow: hidden;
}

#header:deep(.menu:last-child) {
    flex-shrink: 0;
    min-width: fit-content;
}

.signBox {
    margin: 0 auto;
}

.signBox .avatar {
    background-color: #f56a00;
    cursor: pointer;
}

.signBox span.name {
    margin: auto 10px;
}

.flag {
    vertical-align: sub;
}

/* Force Ant Design Menu to handle overflow properly */
#header:deep(.ant-menu-horizontal) {
    border-bottom: none !important;
    overflow: visible !important;
}

#header:deep(.ant-menu-horizontal > .ant-menu-item),
#header:deep(.ant-menu-horizontal > .ant-menu-submenu) {
    white-space: nowrap;
}

/* Ensure proper menu overflow behavior */
#header:deep(.menu:first-child .ant-menu-horizontal) {
    overflow: hidden;
    flex-wrap: nowrap;
}

#header:deep(.menu:last-child .ant-menu-horizontal) {
    overflow: visible;
    flex-wrap: nowrap;
}

/* Prevent menu items from being hidden on dynamic content changes */
#header:deep(.ant-menu-horizontal .ant-menu-submenu-title),
#header:deep(.ant-menu-horizontal .ant-menu-item) {
    display: inline-block !important;
}

/* Ensure menus recalculate properly on window resize */
#header:deep(.ant-menu-horizontal) {
    transition: none !important;
}

#header:deep(.ant-menu-overflow) {
    transition: none !important;
}

/* Language selection styling */
.selected-language {
    position: relative;
}

.selected-language .language-name {
    font-weight: 600 !important;
}

.selected-indicator {
    color: #1890ff;
    margin-left: 8px;
    font-size: 12px;
}

.dark .selected-indicator {
    color: #69c0ff;
}

#header:deep(.selected-language) {
    background-color: rgba(24, 144, 255, 0.08) !important;
}

#header:deep(.dark .selected-language) {
    background-color: rgba(105, 192, 255, 0.08) !important;
}

@media (max-width: 480px) {
    #header .logo {
        display: none;
    }
    
    #header:deep(.signBox .ant-btn span:not(.anticon)) {
        display: none !important;
    }
}
</style>
