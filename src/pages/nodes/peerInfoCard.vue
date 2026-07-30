<!--
*******************************************************************
pages/nodes/peerInfoCard.vue

Copyright (C) 2024 iEdon
Copyright (C) 2026 Luochancy

This file is part of a project derived from iedon-net-frontend.
Modified by Luochancy on 2026-06.

Licensed under the GNU General Public License v3.0.
See the LICENSE file in the project root for details.
*******************************************************************
-->
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { onMounted, onUnmounted, nextTick, ref } from 'vue'
import { RouterInfoResponse, RouterMetadata } from '../../common/packetHandler'
import { siteConfig, themeName, showSnackbar } from '../../common/helper'
import { parseI18nContent } from '../../common/i18nContent'

// @ts-ignore
import markdown_it from 'markdown-it'
// @ts-ignore
import mila from 'markdown-it-link-attributes'

const md = new markdown_it().use(mila, { attrs: { target: "_blank" } })

const props = defineProps<{
    router: RouterMetadata,
    routerInfo: RouterInfoResponse | null,
    linkType?: string,
}>()

const { t, locale } = useI18n()
const cardRef = ref<any>()
const codeClickHandlers = new Map<HTMLElement, () => void>()

const copyToClipboard = async (text: string) => {
    try {
        await navigator.clipboard.writeText(text)
        showSnackbar(t('pages.nodes.copied'), 'info')
    } catch (err) {
        console.error(`Failed to copy ${text}:`, err)
    }
}

const setupCodeListeners = () => {
    const el = cardRef.value?.$el || cardRef.value
    if (!el) return

    const codeElements = el.querySelectorAll('.desc code') as NodeListOf<HTMLElement>
    codeElements.forEach(code => {
        const handler = () => {
            copyToClipboard(code.textContent || '')
        }

        code.addEventListener('click', handler)
        code.style.cursor = 'pointer'

        // Store handler for cleanup
        codeClickHandlers.set(code as HTMLElement, handler)
    })
}

const cleanupCodeListeners = () => {
    codeClickHandlers.forEach((handler, element) => {
        element.removeEventListener('click', handler)
    })
    codeClickHandlers.clear()
}

onMounted(() => {
    nextTick(() => {
        setupCodeListeners()
    })
})

onUnmounted(() => {
    cleanupCodeListeners()
})
</script>

<template>
    <v-card ref="cardRef" rounded="xl" elevation="0" color="surface-container-low" border class="peer-info-card mb-4">
        <v-card-text>
        <h3 class="text-subtitle-1 font-weight-medium mb-3">{{ t('pages.peering.step2Introduction') }}</h3>

        <div class="d-flex flex-wrap ga-3 mb-2">
            <v-chip v-if="props.router.ipv4" variant="tonal" rounded="lg" size="small" @click="copyToClipboard(siteConfig.netAsn)" class="cursor-pointer">
                ASN <code class="ml-1">{{ siteConfig.netAsn }}</code>
            </v-chip>
            <v-chip v-if="props.router.ipv4" variant="tonal" rounded="lg" size="small" @click="copyToClipboard(props.router.ipv4)" class="cursor-pointer">
                IPv4 <code class="ml-1">{{ props.router.ipv4 }}</code>
            </v-chip>
            <v-chip v-if="props.router.ipv6" variant="tonal" rounded="lg" size="small" @click="copyToClipboard(props.router.ipv6)" class="cursor-pointer">
                IPv6 <code class="ml-1">{{ props.router.ipv6 }}</code>
            </v-chip>
            <v-chip v-if="props.router.ipv6LinkLocal" variant="tonal" rounded="lg" size="small"
                @click="copyToClipboard(props.router.ipv6LinkLocal)" class="cursor-pointer">
                Link <code class="ml-1">{{ props.router.ipv6LinkLocal }}</code>
            </v-chip>
        </div>

        <p class="text-caption text-medium-emphasis mb-2">{{ t('pages.peering.v4v6force') }}</p>

        <div v-if="props.router.description" class="desc text-body-2" v-html="md.render(parseI18nContent(props.router.description, locale))"></div>
        <div v-else-if="props.routerInfo?.info" class="desc text-body-2" v-html="md.render(props.routerInfo.info)"></div>
        </v-card-text>
    </v-card>

    <!-- Direct Ethernet: separate card for LAN info -->
    <v-card v-if="props.linkType === 'direct'" rounded="xl" elevation="0" color="surface-container-low" border class="peer-info-card mb-4">
        <v-card-text>
            <h3 class="text-subtitle-1 font-weight-medium mb-3">{{ t('pages.peering.directTitle') }}</h3>
            <p class="mb-1">{{ t('pages.peering.directLanInfo') }}:</p>
            <ul class="lan-list">
                <li>LAN IPv4: <code>{{ props.routerInfo?.directLocalIps?.ipv4 || '(none)' }}</code></li>
                <li>LAN IPv6: <code>{{ props.routerInfo?.directLocalIps?.ipv6 || '(none)' }}</code></li>
                <li>LAN IPv6 Link-Local: <code>{{ props.routerInfo?.directLocalIps?.ipv6LinkLocal || '(none)' }}</code></li>
                <li>MTU: <code>{{ props.routerInfo?.directLocalIps?.defaultMTU || 1500 }}</code></li>
            </ul>
        </v-card-text>
    </v-card>
</template>

<style scoped>
.peer-info-card code {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 0.8em;
    font-weight: 600;
    color: rgb(var(--v-theme-primary));
}
.cursor-pointer {
    cursor: pointer;
}
.lan-list {
    list-style: none;
    padding: 0;
    margin: 4px 0;
}
.lan-list li {
    margin: 2px 0;
}
.desc {
    color: rgb(var(--v-theme-on-surface));
}
.desc:deep(p) {
    margin: 4px 0;
}
.desc:deep(a) {
    color: rgb(var(--v-theme-primary));
    text-decoration: none;
}
.desc:deep(a):hover {
    text-decoration: underline;
}
.desc:deep(code) {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    background: rgb(var(--v-theme-surface-variant));
    color: rgb(var(--v-theme-error));
    padding: 0.15rem 0.35rem;
    font-size: 0.85em;
    border-radius: 4px;
    font-weight: 500;
    cursor: pointer;
}
</style>
