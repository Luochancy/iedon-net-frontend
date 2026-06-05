<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { registerPageTitle, showSnackbar } from '../../common/helper'
import config from '../../config'

const t = useI18n().t

// Types
interface BgpProtocol {
    name: string
    proto: string
    state: string
    since: string
    info: string
}

interface RouteEntry {
    network: string
    gateway: string
    interface: string
    metric: number
    preference: number
    [key: string]: any
}

// State
const activeTab = ref(0)
const loading = ref(false)

// Protocols state
const protocols = ref<BgpProtocol[]>([])
const protocolsLoading = ref(false)
const protocolDetailDialog = ref(false)
const selectedProtocol = ref<string>('')
const protocolDetail = ref<any>(null)
const protocolDetailLoading = ref(false)

// Routes state
const routePrefix = ref('')
const routes = ref<RouteEntry[]>([])
const routesLoading = ref(false)
const routeSearched = ref(false)

// Protocols table headers
const protocolHeaders = [
    { title: t('pages.lg.name'), key: 'name', sortable: true },
    { title: t('pages.lg.protocol'), key: 'proto', sortable: true },
    { title: t('pages.lg.state'), key: 'state', sortable: true },
    { title: t('pages.lg.since'), key: 'since', sortable: true },
    { title: t('pages.lg.info'), key: 'info', sortable: false },
]

// Routes table headers
const routeHeaders = [
    { title: t('pages.lg.network'), key: 'network', sortable: true },
    { title: t('pages.lg.gateway'), key: 'gateway', sortable: true },
    { title: t('pages.lg.interface'), key: 'interface', sortable: true },
    { title: t('pages.lg.metric'), key: 'metric', sortable: true },
    { title: t('pages.lg.preference'), key: 'preference', sortable: true },
]

// Get auth token
const getToken = (): string | null => {
    return localStorage.getItem('token')
}

// Fetch protocols
const fetchProtocols = async () => {
    protocolsLoading.value = true
    try {
        const resp = await fetch(`${config.apiPrefix}/lg/protocols`)
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const data = await resp.json()
        protocols.value = Array.isArray(data) ? data : (data.protocols || [])
    } catch (error: any) {
        console.error('Failed to fetch protocols:', error)
        showSnackbar(t('pages.lg.loadProtocolsFailed') + ': ' + (error.message || 'Unknown error'), 'error')
    } finally {
        protocolsLoading.value = false
    }
}

// Fetch protocol detail
const fetchProtocolDetail = async (name: string) => {
    const token = getToken()
    if (!token) {
        showSnackbar(t('pages.lg.authRequiredWarning'), 'warning')
        return
    }
    selectedProtocol.value = name
    protocolDetail.value = null
    protocolDetailLoading.value = true
    protocolDetailDialog.value = true
    try {
        const resp = await fetch(`${config.apiPrefix}/lg/protocols/${encodeURIComponent(name)}`, {
            headers: { Authorization: `Bearer ${token}` }
        })
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        protocolDetail.value = await resp.json()
    } catch (error: any) {
        console.error('Failed to fetch protocol detail:', error)
        showSnackbar(t('pages.lg.loadDetailFailed') + ': ' + (error.message || 'Unknown error'), 'error')
    } finally {
        protocolDetailLoading.value = false
    }
}

// Fetch routes
const fetchRoutes = async () => {
    if (!routePrefix.value.trim()) {
        showSnackbar(t('pages.lg.enterPrefixWarning'), 'warning')
        return
    }
    const token = getToken()
    if (!token) {
        showSnackbar(t('pages.lg.authRequiredWarning'), 'warning')
        return
    }
    routesLoading.value = true
    routeSearched.value = true
    routes.value = []
    try {
        const resp = await fetch(`${config.apiPrefix}/lg/routes/${encodeURIComponent(routePrefix.value.trim())}`, {
            headers: { Authorization: `Bearer ${token}` }
        })
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const data = await resp.json()
        routes.value = Array.isArray(data) ? data : (data.routes || [])
    } catch (error: any) {
        console.error('Failed to fetch routes:', error)
        showSnackbar(t('pages.lg.loadRoutesFailed') + ': ' + (error.message || 'Unknown error'), 'error')
    } finally {
        routesLoading.value = false
    }
}

// State color helper
const getStateColor = (state: string): string => {
    const s = state?.toLowerCase() || ''
    if (s === 'up' || s === 'established') return 'success'
    if (s === 'down') return 'error'
    if (s.includes('start') || s.includes('idle') || s.includes('connect') || s.includes('active')) return 'warning'
    return 'default'
}

onMounted(() => {
    registerPageTitle(t('pages.lg.title'))
    fetchProtocols()
})
</script>

<template>
    <div class="lg-page">
        <!-- Header -->
        <div class="page-header">
            <h1 class="text-h4 font-weight-bold d-flex align-center justify-center ga-3 mb-1">
                <v-icon size="32" color="primary">mdi-magnify</v-icon>
                {{ t('pages.lg.title') }}
            </h1>
            <p class="text-body-1 text-medium-emphasis">{{ t('pages.lg.subtitle') }}</p>
        </div>

        <v-container style="max-width: 1200px">
            <v-card rounded="xl" elevation="0">
                <v-tabs v-model="activeTab" color="primary" align-tabs="center">
                    <v-tab :value="0">
                        <v-icon start>mdi-lan</v-icon>
                        {{ t('pages.lg.protocols') }}
                    </v-tab>
                    <v-tab :value="1">
                        <v-icon start>mdi-routes</v-icon>
                        {{ t('pages.lg.routes') }}
                    </v-tab>
                </v-tabs>

                <v-divider />

                <v-tabs-window v-model="activeTab">
                    <!-- Protocols Tab -->
                    <v-tabs-window-item :value="0">
                        <v-card-text>
                            <div class="d-flex justify-end mb-4">
                                <v-btn
                                    color="primary"
                                    variant="tonal"
                                    size="small"
                                    prepend-icon="mdi-refresh"
                                    @click="fetchProtocols"
                                >
                                    {{ t('pages.lg.refresh') }}
                                </v-btn>
                            </div>

                            <v-data-table
                                :headers="protocolHeaders"
                                :items="protocols"
                                :loading="protocolsLoading"
                                hover
                                density="comfortable"
                                :items-per-page="25"
                                :sort-by="[{ key: 'name', order: 'asc' }]"
                            >
                                <template v-slot:item.name="{ item }">
                                    <a
                                        href="#"
                                        class="text-primary font-weight-medium text-decoration-underline"
                                        @click.prevent="fetchProtocolDetail(item.name)"
                                    >
                                        {{ item.name }}
                                    </a>
                                </template>

                                <template v-slot:item.state="{ item }">
                                    <v-chip
                                        :color="getStateColor(item.state)"
                                        size="small"
                                        variant="tonal"
                                    >
                                        {{ item.state }}
                                    </v-chip>
                                </template>

                                <template v-slot:no-data>
                                    <div class="text-center pa-8 text-medium-emphasis">
                                        <v-icon size="48" class="mb-2">mdi-lan-disconnect</v-icon>
                                        <p>{{ t('pages.lg.noProtocols') }}</p>
                                    </div>
                                </template>

                                <template v-slot:loading>
                                    <v-skeleton-loader type="table-row@10" />
                                </template>
                            </v-data-table>
                        </v-card-text>
                    </v-tabs-window-item>

                    <!-- Routes Tab -->
                    <v-tabs-window-item :value="1">
                        <v-card-text>
                            <v-row class="mb-4">
                                <v-col cols="12" sm="8" md="9">
                                    <v-text-field
                                        v-model="routePrefix"
                                        :label="t('pages.lg.prefixLabel')"
                                        :placeholder="t('pages.lg.prefixPlaceholder')"
                                        variant="outlined"
                                        density="comfortable"
                                        prepend-inner-icon="mdi-ip-network"
                                        hide-details
                                        clearable
                                        @keyup.enter="fetchRoutes"
                                    />
                                </v-col>
                                <v-col cols="12" sm="4" md="3">
                                    <v-btn
                                        color="primary"
                                        block
                                        height="48"
                                        @click="fetchRoutes"
                                    >
                                        <v-icon start>mdi-magnify</v-icon>
                                        {{ t('pages.lg.query') }}
                                    </v-btn>
                                </v-col>
                            </v-row>

                            <v-alert
                                v-if="!getToken()"
                                type="info"
                                variant="tonal"
                                class="mb-4"
                                density="compact"
                            >
                                {{ t('pages.lg.authRequired') }}
                            </v-alert>

                            <v-data-table
                                v-if="routeSearched"
                                :headers="routeHeaders"
                                :items="routes"
                                :loading="routesLoading"
                                hover
                                density="comfortable"
                                :items-per-page="25"
                            >
                                <template v-slot:no-data>
                                    <div class="text-center pa-8 text-medium-emphasis">
                                        <v-icon size="48" class="mb-2">mdi-routes-clock</v-icon>
                                        <p>{{ t('pages.lg.noRoutes') }}</p>
                                    </div>
                                </template>

                                <template v-slot:loading>
                                    <v-skeleton-loader type="table-row@10" />
                                </template>
                            </v-data-table>

                            <div v-else class="text-center pa-12 text-medium-emphasis">
                                <v-icon size="64" class="mb-4">mdi-magnify</v-icon>
                                <p class="text-h6">{{ t('pages.lg.enterPrefix') }}</p>
                            </div>
                        </v-card-text>
                    </v-tabs-window-item>
                </v-tabs-window>
            </v-card>
        </v-container>

        <!-- Protocol Detail Dialog -->
        <v-dialog v-model="protocolDetailDialog" max-width="800" scrollable>
            <v-card rounded="xl">
                <v-card-title class="d-flex align-center ga-2 pa-6 pb-2">
                    <v-icon color="primary">mdi-lan</v-icon>
                    {{ t('pages.lg.protocolDetail') }}: {{ selectedProtocol }}
                </v-card-title>
                <v-divider />
                <v-card-text class="pa-6" style="max-height: 60vh">
                    <v-progress-linear v-if="protocolDetailLoading" indeterminate color="primary" class="mb-4" />
                    <pre v-if="protocolDetail" class="detail-pre">{{ JSON.stringify(protocolDetail, null, 2) }}</pre>
                    <div v-else-if="!protocolDetailLoading" class="text-center text-medium-emphasis pa-8">
                        {{ t('pages.lg.noDetail') }}
                    </div>
                </v-card-text>
                <v-card-actions class="pa-4">
                    <v-spacer />
                    <v-btn variant="text" @click="protocolDetailDialog = false">{{ t('pages.lg.close') }}</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<style scoped>
.lg-page {
    min-height: 100vh;
}

.page-header {
    text-align: center;
    padding: 2rem 1rem 1rem;
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
</style>
