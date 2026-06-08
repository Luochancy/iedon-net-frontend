<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { registerPageTitle, showSnackbar } from '../../common/helper'
import { makeRequest } from '../../common/packetHandler'

const router = useRouter()
const route = useRoute()
const t = useI18n().t

const routerUuid = route.params.routerUuid as string
const protocolName = decodeURIComponent(route.params.protocolName as string)

// State
const loading = ref(true)
const detail = ref<any>(null)
const routerName = ref('')

// Fetch protocol detail
const fetchDetail = async () => {
    loading.value = true
    try {
        const resp = await makeRequest(t, `/lg/protocols/${encodeURIComponent(protocolName)}`, undefined, true)
        if (resp.success && resp.response) {
            detail.value = resp.response
        } else {
            showSnackbar(t('pages.lg.loadDetailFailed'), 'error')
        }
    } catch (e) {
        console.error(e)
        showSnackbar(t('pages.lg.loadDetailFailed'), 'error')
    } finally {
        loading.value = false
    }
}

// Fetch router name
const fetchRouterName = async () => {
    try {
        const resp = await makeRequest(t, '/list/routers', undefined, true)
        if (resp.success && resp.response) {
            const data = resp.response as { routers: Array<{ uuid: string; name: string }> }
            const r = data.routers?.find((r: any) => r.uuid === routerUuid)
            if (r) routerName.value = r.name
        }
    } catch (_) { /* ignore */ }
}

// State color
const getStateColor = (state: string): string => {
    const s = state?.toLowerCase() || ''
    if (s === 'up' || s === 'established') return 'success'
    if (s === 'down') return 'error'
    if (s.includes('start') || s.includes('idle') || s.includes('connect') || s.includes('active')) return 'warning'
    return 'default'
}

// Format detail for display
const formattedDetail = computed(() => {
    if (!detail.value) return []
    const lines: Array<{ label: string; value: string; color?: string }> = []

    // BGP state
    if (detail.value.name) lines.push({ label: t('pages.lg.name'), value: detail.value.name })
    if (detail.value.proto) lines.push({ label: t('pages.lg.protocol'), value: detail.value.proto })
    if (detail.value.state) lines.push({ label: t('pages.lg.state'), value: detail.value.state, color: getStateColor(detail.value.state) })
    if (detail.value.since) lines.push({ label: t('pages.lg.since'), value: detail.value.since })
    if (detail.value.info) lines.push({ label: t('pages.lg.info'), value: detail.value.info })

    // Neighbor info
    if (detail.value.neighbor_address) lines.push({ label: 'Neighbor', value: detail.value.neighbor_address })
    if (detail.value.neighbor_as) lines.push({ label: 'Neighbor AS', value: String(detail.value.neighbor_as) })
    if (detail.value.local_as) lines.push({ label: 'Local AS', value: String(detail.value.local_as) })

    return lines
})

const goBack = () => {
    router.push(`/lg`)
}

onMounted(async () => {
    // Check login
    const token = localStorage.getItem('token')
    if (!token) {
        showSnackbar(t('pages.lg.authRequiredWarning'), 'warning')
        router.replace({ path: '/signin' })
        return
    }

    registerPageTitle(`${t('pages.lg.protocolDetail')} - ${protocolName}`)
    await Promise.all([fetchRouterName(), fetchDetail()])
})
</script>

<template>
    <div class="lg-detail-page">
        <div class="page-header">
            <div class="d-flex align-center ga-2 mb-1" style="max-width: 1200px; margin: 0 auto">
                <v-btn variant="text" @click="goBack" prepend-icon="mdi-arrow-left" class="back-btn">
                    {{ t('pages.lg.back') }}
                </v-btn>
            </div>
            <h1 class="text-h4 font-weight-bold d-flex align-center justify-center ga-3 mb-1">
                <v-icon size="32" color="primary">mdi-lan</v-icon>
                {{ t('pages.lg.protocolDetail') }}
            </h1>
            <p class="text-body-1 text-medium-emphasis">
                {{ routerName ? `${routerName} / ` : '' }}<code class="font-mono">{{ protocolName }}</code>
            </p>
        </div>

        <v-container style="max-width: 800px">
            <!-- Loading -->
            <div v-if="loading" class="d-flex justify-center align-center pa-12">
                <v-progress-circular indeterminate color="primary" size="40" />
            </div>

            <!-- Detail content -->
            <v-card v-else-if="detail" rounded="xl" elevation="0" border>
                <v-list lines="two">
                    <v-list-item v-for="item in formattedDetail" :key="item.label">
                        <template #prepend>
                            <v-list-item-title class="text-caption text-medium-emphasis" style="min-width: 120px">
                                {{ item.label }}
                            </v-list-item-title>
                        </template>
                        <v-list-item-subtitle v-if="item.color">
                            <v-chip :color="item.color" size="small" variant="tonal" class="font-weight-medium">
                                {{ item.value }}
                            </v-chip>
                        </v-list-item-subtitle>
                        <v-list-item-subtitle v-else class="font-mono">
                            {{ item.value }}
                        </v-list-item-subtitle>
                    </v-list-item>
                </v-list>

                <!-- Raw JSON for advanced details -->
                <v-divider />
                <v-card-text>
                    <div class="text-caption text-medium-emphasis mb-2">{{ t('pages.lg.rawData') }}</div>
                    <pre class="detail-pre">{{ JSON.stringify(detail, null, 2) }}</pre>
                </v-card-text>
            </v-card>

            <!-- No data -->
            <div v-else class="text-center pa-12 text-medium-emphasis">
                <v-icon size="64" class="mb-4">mdi-lan-disconnect</v-icon>
                <p class="text-h6">{{ t('pages.lg.noDetail') }}</p>
            </div>
        </v-container>
    </div>
</template>

<style scoped>
.lg-detail-page {
    min-height: 100vh;
}

.page-header {
    text-align: center;
    padding: 1rem 1rem 0.5rem;
}

.back-btn {
    align-self: flex-start;
}

.detail-pre {
    background: rgb(var(--v-theme-surface-container-low, 245, 245, 245));
    border-radius: 12px;
    padding: 16px;
    font-size: 13px;
    line-height: 1.5;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: 'Roboto Mono', monospace;
}

.font-mono {
    font-family: 'Roboto Mono', 'SF Mono', 'Fira Code', monospace;
    font-size: 0.9em;
}
</style>
