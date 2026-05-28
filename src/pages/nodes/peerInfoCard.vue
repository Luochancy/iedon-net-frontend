<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { onMounted, onUnmounted, nextTick, ref } from 'vue'
import { RouterInfoResponse, RouterMetadata } from '../../common/packetHandler'
import { siteConfig, themeName, showSnackbar } from '../../common/helper'

// @ts-ignore
import markdown_it from 'markdown-it'
// @ts-ignore
import mila from 'markdown-it-link-attributes'

const md = new markdown_it().use(mila, { attrs: { target: "_blank" } })

const props = defineProps<{
    router: RouterMetadata,
    routerInfo: RouterInfoResponse | null,
}>()

const { t } = useI18n()
const cardRef = ref<HTMLElement>()
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
    if (!cardRef.value) return

    const codeElements = cardRef.value.querySelectorAll('.desc code') as NodeListOf<HTMLElement>
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
    <v-card ref="cardRef" rounded="lg" variant="tonal" color="surface" class="peer-info-card mb-4">
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

        <div v-if="props.router.description" class="desc text-body-2" v-html="md.render(props.router.description)"></div>
        <div v-if="props.routerInfo?.info" class="desc text-body-2" v-html="md.render(props.routerInfo.info)"></div>
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
