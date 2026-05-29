<script setup lang="ts">
import { onMounted, onUnmounted, Ref, ref, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { isAdmin, registerPageTitle, themeName, VAR_SIZE_LG } from '../../common/helper'
import MySessions from './mySessions.vue'
import MyAccount from './myAccount.vue'
import ManageSessions from './manageSessions.vue'
import ManageConfig from './manageConfig.vue'
// import ManagePosts from './managePosts.vue'
import ManageNodes from './manageNodes.vue'

const t = useI18n().t

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

onMounted(async () => {
    selectedKeys.value[0] = isAdmin.value ? 'manageSessions' : 'mySessions'
})

onUnmounted(() => {
    titleWatcher()
})

const collapsed: Ref<boolean> =  ref(false)
const toggleMenu = () => {
    collapsed.value = !collapsed.value
    window.scrollTo(0, 0)
}
const backToTop = () => {
    window.scrollTo(0, 0)
    const width  = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth
    if (width < VAR_SIZE_LG) {
        collapsed.value = true
    }
}
</script>

<template>
    <v-layout class="manage-layout" style="min-height: 100vh;">
        <v-navigation-drawer
            :model-value="!collapsed"
            @update:model-value="(val: boolean) => collapsed = !val"
            :permanent="false"
            :temporary="true"
            width="260"
            elevation="0"
            class="manage-drawer"
        >
            <div class="drawer-header">
                <v-icon size="28" color="primary">mdi-cog-outline</v-icon>
                <span class="drawer-title">{{ t('header.manage') }}</span>
            </div>
            <v-divider class="mb-2" />
            <v-list nav density="comfortable" rounded="lg" class="manage-nav-list">
                <template v-if="!isAdmin">
                    <v-list-item
                        value="mySessions"
                        :active="selectedKeys[0] === 'mySessions'"
                        @click="selectedKeys = ['mySessions']; backToTop()"
                        prepend-icon="mdi-link"
                        rounded="lg"
                        :active-color="'primary'"
                        :class="{ 'active-nav-item': selectedKeys[0] === 'mySessions' }"
                    >
                        {{ title.mySessions }}
                    </v-list-item>
                    <v-list-item
                        value="myAccount"
                        :active="selectedKeys[0] === 'myAccount'"
                        @click="selectedKeys = ['myAccount']; backToTop()"
                        prepend-icon="mdi-account"
                        rounded="lg"
                        :active-color="'primary'"
                        :class="{ 'active-nav-item': selectedKeys[0] === 'myAccount' }"
                    >
                        {{ title.myAccount }}
                    </v-list-item>
                </template>
                <template v-else>
                    <v-list-item
                        value="manageSessions"
                        :active="selectedKeys[0] === 'manageSessions'"
                        @click="selectedKeys = ['manageSessions']; backToTop()"
                        prepend-icon="mdi-link"
                        rounded="lg"
                        :active-color="'primary'"
                        :class="{ 'active-nav-item': selectedKeys[0] === 'manageSessions' }"
                    >
                        {{ title.manageSessions }}
                    </v-list-item>
                    <v-list-item
                        value="manageNodes"
                        :active="selectedKeys[0] === 'manageNodes'"
                        @click="selectedKeys = ['manageNodes']; backToTop()"
                        prepend-icon="mdi-earth"
                        rounded="lg"
                        :active-color="'primary'"
                        :class="{ 'active-nav-item': selectedKeys[0] === 'manageNodes' }"
                    >
                        {{ title.manageNodes }}
                    </v-list-item>
                    <!--
                    <v-list-item
                        value="managePosts"
                        :active="selectedKeys[0] === 'managePosts'"
                        @click="selectedKeys = ['managePosts']; backToTop()"
                        prepend-icon="mdi-book"
                    >
                        {{ title.managePosts }}
                    </v-list-item>
                    -->
                    <v-list-item
                        value="manageConfig"
                        :active="selectedKeys[0] === 'manageConfig'"
                        @click="selectedKeys = ['manageConfig']; backToTop()"
                        prepend-icon="mdi-cog"
                        rounded="lg"
                        :active-color="'primary'"
                        :class="{ 'active-nav-item': selectedKeys[0] === 'manageConfig' }"
                    >
                        {{ title.manageConfig }}
                    </v-list-item>
                    <v-list-item
                        value="myAccount"
                        :active="selectedKeys[0] === 'myAccount'"
                        @click="selectedKeys = ['myAccount']; backToTop()"
                        prepend-icon="mdi-account"
                        rounded="lg"
                        :active-color="'primary'"
                        :class="{ 'active-nav-item': selectedKeys[0] === 'myAccount' }"
                    >
                        {{ title.myAccount }}
                    </v-list-item>
                </template>
            </v-list>
        </v-navigation-drawer>

        <v-main class="manage-content">
            <div class="content-inner">
            <h1 class="manage-header">
                {{ title[selectedKeys[0] as keyof typeof title] || '' }}
            </h1>
            <v-divider class="mb-6" />
            <template v-if="!isAdmin">
                <my-sessions v-if="selectedKeys[0] === 'mySessions'"></my-sessions>
                <my-account v-else-if="selectedKeys[0] === 'myAccount'"></my-account>
            </template>
            <template v-else>
                <manage-sessions v-if="selectedKeys[0] === 'manageSessions'"></manage-sessions>
                <manage-config v-if="selectedKeys[0] === 'manageConfig'"></manage-config>
                <!-- <manage-posts v-if="selectedKeys[0] === 'managePosts'"></manage-posts> -->
                <manage-nodes v-if="selectedKeys[0] === 'manageNodes'"></manage-nodes>
                <my-account v-else-if="selectedKeys[0] === 'myAccount'"></my-account>
            </template>
            </div>
        </v-main>

        <v-btn
            class="trigger-fab"
            @click="toggleMenu"
            :style="{ position: 'fixed', left: '30px', bottom: '30px', zIndex: 1000 }"
            icon
            size="large"
            color="primary"
            elevation="3"
            rounded="xl"
        >
            <v-icon>{{ collapsed ? 'mdi-menu-open' : 'mdi-menu' }}</v-icon>
            <v-tooltip activator="parent" location="top">
                {{ collapsed ? t('pages.manage.openMenu') : t('pages.manage.closeMenu') }}
            </v-tooltip>
        </v-btn>
    </v-layout>
</template>

<style scoped>
.manage-layout {
    background: transparent;
}
.manage-drawer {
    border-right: 1px solid rgba(var(--v-border-color), 0.12) !important;
    padding-top: 16px;
}
.drawer-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 20px 16px;
}
.drawer-title {
    font-size: 18px;
    font-weight: 600;
    color: rgb(var(--v-theme-on-surface));
}
.manage-nav-list {
    padding: 0 8px !important;
}
.active-nav-item {
    background-color: rgb(var(--v-theme-primary-container)) !important;
}
.manage-content {
    padding: 0;
}
.content-inner {
    padding: 32px 40px;
    max-width: 1200px;
    margin: 0 auto;
}
.manage-header {
    font-size: 28px;
    font-weight: 600;
    letter-spacing: 0.25px;
    text-align: center;
    color: rgb(var(--v-theme-on-surface));
    margin-bottom: 8px;
}
@media (max-width: 960px) {
    .content-inner {
        padding: 24px 16px;
    }
}
</style>
