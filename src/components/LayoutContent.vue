<!--
*******************************************************************
components/LayoutContent.vue

Copyright (C) 2024 iEdon
Copyright (C) 2026 Luochancy

This file is part of a project derived from iedon-net-frontend.
Modified by Luochancy on 2026-06.

Licensed under the GNU General Public License v3.0.
See the LICENSE file in the project root for details.
*******************************************************************
-->
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const transitionName = ref('page-transition')

watch(() => route.path, () => {
  transitionName.value = 'page-transition'
})
</script>

<template>
    <v-container fluid class="content-wrapper pa-0">
        <div class="page-inner">
            <router-view v-slot="{ Component, route }">
                <transition :name="transitionName" mode="out-in" appear>
                    <component :is="Component" :key="route.path"></component>
                </transition>
            </router-view>
        </div>
    </v-container>
</template>

<style scoped>
.content-wrapper {
    width: 100%;
    min-height: calc(100vh - 64px);
    background-color: rgb(var(--v-theme-background));
}

.page-inner {
    max-width: 1200px;
    margin: 0 auto;
    padding-left: 16px;
    padding-right: 16px;
}

/* Full-bleed pages */
.page-inner:has(.landing-page),
.page-inner:has(.nodes-page),
.page-inner:has(.posts-page),
.page-inner:has(#manage-page),
.page-inner:has(#signin) {
    max-width: 100% !important;
    padding-left: 0;
    padding-right: 0;
}

/* Page transitions - minimal crossfade only */
.page-transition-enter-active,
.page-transition-leave-active {
    transition: opacity 0.15s ease;
}

.page-transition-enter-from,
.page-transition-leave-to {
    opacity: 0;
}
</style>
