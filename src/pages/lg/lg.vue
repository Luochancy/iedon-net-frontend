<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { registerPageTitle, showSnackbar, loggedIn } from '../../common/helper'
import { makeRequest } from '../../common/packetHandler'

const t = useI18n().t

// Types
interface BgpProtocol {
    name: string
    proto: string
    state: string
    since: string
    info: string
}

interface RouterProtocols {
    routerUuid: string
    routerName: string
    protocols: BgpProtocol[]
}

interface RouteEntry {
    network: string
    gateway: string
    interface: string
    metric: number
    preference: number
}

// State
const activeTab = ref(0)
const token = () => localStorage.getItem('token')

// Protocols
const protocols = ref<BgpProtocol[]>([])
const protocolsLoading = ref(false)
const protocolDetailDialog = ref(false)
const selectedProtocol = ref('')
const protocolDetail = ref<any>(null)
const protocolDetailLoading = ref(false)

// Routes
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

// Fetch protocols (public, no auth needed)
const fetchProtocols = async () => {
    protocolsLoading.value = true
    protocols.value = []
    try {
        const resp = await makeRequest(t, '/lg/protocols', undefined, true)
        if (resp.success && resp.response) {
            // Response: { routers: [{ routerUuid, routerName, protocols: [...] }] }
            const data = resp.response as unknown as { routers: RouterProtocols[] }
            if (data.routers && Array.isArray(data.routers)) {
                // Flatten all protocols from all routers, prefix with router name
                const all: BgpProtocol[] = []
                for (const r of data.routers) {
                    for (const p of r.protocols) {
                        all.push({ ...p, name: `${r.routerName}/${p.name}` })
                    }
                }
                protocols.value = all
            }
        }
    } catch (e) {
        console.error(e)
        showSnackbar(t('pages.lg.loadProtocolsFailed'), 'error')
    } finally {
        protocolsLoading.value = false
    }
}

// Fetch protocol detail (auth required)
const fetchProtocolDetail = async (name: string) => {
    if (!token()) {
        showSnackbar(t('pages.lg.authRequiredWarning'), 'warning')
        return
    }
    // Extract real protocol name (remove router prefix)
    const realName = name.includes('/') ? name.split('/').slice(1).join('/') : name
    selectedProtocol.value = name
    protocolDetail.value = null
    protocolDetailLoading.value = true
    protocolDetailDialog.value = true
    try {
        const resp = await makeRequest(t, `/lg/protocols/${encodeURIComponent(realName)}`, undefined, true)
        if (resp.success && resp.response) {
            protocolDetail.value = resp.response
        }
    } catch (e) {
        console.error(e)
        showSnackbar(t('pages.lg.loadDetailFailed'), 'error')
    } finally {
        protocolDetailLoading.value = false
    }
}

// Fetch routes (auth required)
const fetchRoutes = async () => {
    if (!routePrefix.value.trim()) {
        showSnackbar(t('pages.lg.enterPrefixWarning'), 'warning')
        return
    }
    if (!token()) {
        showSnackbar(t('pages.lg.authRequiredWarning'), 'warning')
        return
    }
    routesLoading.value = true
    routeSearched.value = true
    routes.value = []
    try {
        const resp = await makeRequest(t, `/lg/routes/${encodeURIComponent(routePrefix.value.trim())}`, undefined, true)
        if (resp.success && resp.response) {
            routes.value = Array.isArray(resp.response) ? resp.response : []
        }
    } catch (e) {
        console.error(e)
        showSnackbar(t('pages.lg.loadRoutesFailed'), 'error')
    } finally {
        routesLoading.value = false
    }
}

// State color
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
                                    variant="tonal"
                                    size="small"
                                    prepend-icon="mdi-refresh"
                                    @click="fetchProtocols"
                                >
                                    {{ t('pages.lg.refresh') }}
                                </v-btn>
                            </div>

                            <!-- Single loading state -->
                            <div v-if="protocolsLoading" class="d-flex justify-center align-center" style="min-height: 200px">
                                <v-progress-circular indeterminate color="primary" size="40" />
                            </div>

                            <v-data-table
                                v-else
                                :headers="protocolHeaders"
                                :items="protocols"
                                hover
                                density="compact"
                                :items-per-page="25"
                                :sort-by="[{ key: 'name', order: 'asc' }]"
                                class="lg-table"
                            >
                                <template #item.name="{ item }">
                                    <a
                                        href="#"
                                        class="text-primary font-weight-medium text-decoration-underline"
                                        @click.prevent="fetchProtocolDetail(item.name)"
                                    >
                                        {{ item.name }}
                                    </a>
                                </template>

                                <template #item.state="{ item }">
                                    <v-chip :color="getStateColor(item.state)" size="small" variant="tonal">
                                        {{ item.state }}
                                    </v-chip>
                                </template>

                                <template #no-data>
                                    <div class="text-center pa-8 text-medium-emphasis">
                                        <v-icon size="48" class="mb-2">mdi-lan-disconnect</v-icon>
                                        <p>{{ t('pages.lg.noProtocols') }}</p>
                                    </div>
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
                                        :placeholder="t('pages.lg.prefixPlaceholder')"
                                        variant="solo-filled"
                                        rounded="pill"
                                        density="comfortable"
                                        bg-color="surface-container-high"
                                        prepend-inner-icon="mdi-magnify"
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
                                        :loading="routesLoading"
                                        @click="fetchRoutes"
                                    >
                                        <v-icon start>mdi-magnify</v-icon>
                                        {{ t('pages.lg.query') }}
                                    </v-btn>
                                </v-col>
                            </v-row>

                            <v-alert v-if="!token()" type="info" variant="tonal" class="mb-4" density="compact">
                                {{ t('pages.lg.authRequired') }}
                            </v-alert>

                            <!-- Single loading state -->
                            <div v-if="routesLoading" class="d-flex justify-center align-center" style="min-height: 200px">
                                <v-progress-circular indeterminate color="primary" size="40" />
                            </div>

                            <v-data-table
                                v-else-if="routeSearched"
                                :headers="routeHeaders"
                                :items="routes"
                                hover
                                density="comfortable"
                                :items-per-page="25"
                            >
                                <template #no-data>
                                    <div class="text-center pa-8 text-medium-emphasis">
                                        <v-icon size="48" class="mb-2">mdi-routes-clock</v-icon>
                                        <p>{{ t('pages.lg.noRoutes') }}</p>
                                    </div>
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
                    <div v-if="protocolDetailLoading" class="d-flex justify-center pa-8">
                        <v-progress-circular indeterminate color="primary" size="32" />
                    </div>
                    <pre v-else-if="protocolDetail" class="detail-pre">{{ JSON.stringify(protocolDetail, null, 2) }}</pre>
                    <div v-else class="text-center text-medium-emphasis pa-8">
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

.lg-table :deep(.v-data-table__tr) {
    height: 48px;
}

.lg-table :deep(.v-data-table__td) {
    padding: 8px 16px !important;
}
</style>
