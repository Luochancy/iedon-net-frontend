<!--
*******************************************************************
pages/manage/manage.vue

Copyright (C) 2024 iEdon
Copyright (C) 2026 Luochancy

This file is part of a project derived from iedon-net-frontend.
Modified by Luochancy on 2026-06.

Licensed under the GNU General Public License v3.0.
See the LICENSE file in the project root for details.
*******************************************************************
-->
<script setup lang="ts">
import { onMounted, onUnmounted, Ref, ref, watchEffect, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { isAdmin, registerPageTitle, manageSelectedTab } from '../../common/helper'
import MySessions from './mySessions.vue'
import MyAccount from './myAccount.vue'
import ManageSessions from './manageSessions.vue'
import ManageConfig from './manageConfig.vue'
// import ManagePosts from './managePosts.vue'

const t = useI18n().t
const router = useRouter()

const selectedKeys: Ref<string[]> = ref([ 'mySessions' ])

const title = {
    mySessions: t('pages.manage.mySessions'),
    myAccount: t('pages.manage.myAccount'),
    manageSessions: t('pages.manage.manageSessions'),
    // managePosts: t('pages.manage.managePosts'),
    manageConfig: t('pages.manage.manageConfig'),
    manageNodes: t('pages.manage.manageNodes'),
}

const titleWatcher = watchEffect(() => {
   registerPageTitle(title[selectedKeys.value[0] as keyof typeof title] || '')
})

onMounted(() => {
    selectedKeys.value[0] = isAdmin.value ? 'manageSessions' : 'mySessions'
    manageSelectedTab.value = selectedKeys.value[0]
    window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
    titleWatcher()
    window.removeEventListener('resize', handleResize)
})

const scrollToTop = () => window.scrollTo(0, 0)

const navItems = computed(() => {
    if (!isAdmin.value) {
        return [
            { key: 'mySessions', icon: 'mdi-link' },
            { key: 'myAccount', icon: 'mdi-account' },
        ]
    }
    return [
        { key: 'manageSessions', icon: 'mdi-link' },
        { key: 'manageNodes', icon: 'mdi-earth' },
        { key: 'manageConfig', icon: 'mdi-cog' },
        { key: 'myAccount', icon: 'mdi-account' },
    ]
})

// Mobile detection
const isMobile = ref(window.innerWidth < 960)
const handleResize = () => {
    isMobile.value = window.innerWidth < 960
}

// Sync from shared state (set by LayoutHeader drawer on mobile)
watch(manageSelectedTab, (newTab) => {
    if (selectedKeys.value[0] !== newTab) {
        selectedKeys.value = [newTab]
        scrollToTop()
    }
})

// Sync to shared state when tab changes locally
const selectTab = (key: string) => {
    if (key === 'manageNodes') {
        router.push('/admin/nodes')
        return
    }
    selectedKeys.value = [key]
    manageSelectedTab.value = key
    scrollToTop()
}
</script>

<template>
    <div class="manage-page">
        <!-- Desktop: top bar with horizontal tab buttons -->
        <div v-if="!isMobile" class="manage-topbar">
            <div class="manage-topbar-inner">
                <v-tabs
                    v-model="selectedKeys[0]"
                    color="primary"
                    density="comfortable"
                    class="manage-tabs"
                    @update:model-value="selectTab"
                >
                    <v-tab
                        v-for="item in navItems"
                        :key="item.key"
                        :value="item.key"
                        rounded="lg"
                    >
                        <v-icon start size="18">{{ item.icon }}</v-icon>
                        {{ title[item.key as keyof typeof title] }}
                    </v-tab>
                </v-tabs>
            </div>
        </div>

        <!-- Mobile: navigation is handled by the app's v-navigation-drawer in LayoutHeader -->

        <div class="manage-content">
            <div class="content-inner">
                <template v-if="!isAdmin">
                    <my-sessions v-if="selectedKeys[0] === 'mySessions'"></my-sessions>
                    <my-account v-else-if="selectedKeys[0] === 'myAccount'"></my-account>
                </template>
                <template v-else>
                    <manage-sessions v-if="selectedKeys[0] === 'manageSessions'"></manage-sessions>
                    <manage-config v-if="selectedKeys[0] === 'manageConfig'"></manage-config>
                    <!-- <manage-posts v-if="selectedKeys[0] === 'managePosts'"></manage-posts> -->
                    <my-account v-else-if="selectedKeys[0] === 'myAccount'"></my-account>
                </template>
            </div>
        </div>
    </div>
</template>

<style scoped>
.manage-page {
    min-height: 100vh;
}
.manage-topbar {
    position: sticky;
    top: 64px;
    z-index: 10;
    background: rgb(var(--v-theme-surface));
    border-bottom: thin solid rgba(var(--v-border-color), 0.12);
}
.manage-topbar-inner {
    max-width: 1200px;
    margin: 0 auto;
    padding: 12px 40px;
}
.manage-tabs {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}
.manage-content {
    padding: 0;
}
.content-inner {
    padding: 24px 40px;
    max-width: 1200px;
    margin: 0 auto;
}
@media (max-width: 960px) {
    .content-inner {
        padding: 20px 16px;
    }
}
</style>
