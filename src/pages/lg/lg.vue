<!--
*******************************************************************
pages/lg/lg.vue

Copyright (C) 2026 Luochancy

Licensed under the GNU General Public License v3.0.
See LICENSE in the project root.
*******************************************************************
-->
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { registerPageTitle, showSnackbar } from '../../common/helper'
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

interface RouterInfo {
    uuid: string
    name: string
    location: string
    ipv4: string
    sessionCount: number
    callback_url?: string
}

type ToolType = 'ping' | 'traceroute' | 'route'

interface ToolOption {
    title: string
    value: ToolType
    icon: string
    placeholder: string
}

const toolOptions: ToolOption[] = [
    { title: 'Ping', value: 'ping', icon: 'mdi-pulse', placeholder: 'IP (e.g. 172.20.0.53)' },
    { title: 'Traceroute', value: 'traceroute', icon: 'mdi-map-marker-path', placeholder: 'IP (e.g. 172.20.0.53)' },
    { title: 'Route', value: 'route', icon: 'mdi-table-network', placeholder: 'IP or prefix (e.g. 172.20.0.0/24)' },
]

// State
const activeTab = ref<string>('protocols')
const routersLoading = ref(false)
const protocolsLoading = ref(false)

const routersList = ref<RouterInfo[]>([])
const selectedRouterUuid = ref<string | null>(null)
const routerData = ref<RouterProtocols[]>([])

// Tools
const toolType = ref<ToolType>('ping')
const toolTarget = ref('')
const toolLoading = ref(false)
const toolResult = ref<any>(null)
const toolError = ref('')

// Computed
const selectedRouter = computed<RouterInfo | undefined>(() =>
    routersList.value.find(r => r.uuid === selectedRouterUuid.value)
)
const selectedRouterProtocols = computed<BgpProtocol[]>(() => {
    if (!selectedRouterUuid.value) return []
    return routerData.value.find(r => r.routerUuid === selectedRouterUuid.value)?.protocols || []
})
const hasLgData = computed(() => selectedRouterProtocols.value.length > 0)
const hasAuth = computed(() => !!localStorage.getItem('token'))
const toolPlaceholder = computed(() =>
    toolOptions.find(o => o.value === toolType.value)?.placeholder || ''
)
const selectedToolOption = computed(() =>
    toolOptions.find(o => o.value === toolType.value)
)

const protocolHeaders = [
    { title: t('pages.lg.name'), key: 'name', sortable: true },
    { title: t('pages.lg.protocol'), key: 'proto', sortable: true },
    { title: t('pages.lg.state'), key: 'state', sortable: true },
    { title: t('pages.lg.since'), key: 'since', sortable: true },
    { title: t('pages.lg.info'), key: 'info', sortable: false },
]

const routeHeaders = [
    { title: 'Prefix', key: 'prefix', sortable: true },
    { title: 'Interface', key: 'interface', sortable: true },
    { title: 'Type', key: 'type', sortable: true },
    { title: 'From', key: 'from', sortable: false },
    { title: 'Metric', key: 'metric', sortable: true },
    { title: 'Since', key: 'since', sortable: false },
]

const fetchRouters = async () => {
    routersLoading.value = true
    try {
        const resp = await makeRequest(t, '/list/routers', undefined, true)
        if (resp.success && resp.response) {
            const data = resp.response as { routers: RouterInfo[] }
            if (data.routers && Array.isArray(data.routers)) {
                routersList.value = data.routers
                if (!selectedRouterUuid.value && data.routers.length > 0)
                    selectedRouterUuid.value = data.routers[0].uuid
            }
        }
    } catch {
        showSnackbar('Failed to load routers', 'error')
    } finally {
        routersLoading.value = false
    }
}

const fetchProtocols = async () => {
    protocolsLoading.value = true
    routerData.value = []
    try {
        const resp = await makeRequest(t, '/lg/protocols', undefined, true)
        if (resp.success && resp.response) {
            const data = resp.response as unknown as { routers: RouterProtocols[] }
            if (data.routers && Array.isArray(data.routers)) routerData.value = data.routers
        }
    } catch {
        showSnackbar(t('pages.lg.loadProtocolsFailed'), 'error')
    } finally {
        protocolsLoading.value = false
    }
}

const runTool = async () => {
    if (!selectedRouterUuid.value || !toolTarget.value.trim()) return
    if (!hasAuth.value) {
        showSnackbar(t('pages.lg.authRequiredWarning'), 'warning')
        return
    }
    toolLoading.value = true
    toolError.value = ''
    toolResult.value = null
    const router = selectedRouterUuid.value
    const target = toolTarget.value.trim()
    try {
        let endpoint: string
        switch (toolType.value) {
            case 'ping':
                endpoint = `/lg/ping?target=${encodeURIComponent(target)}&router=${encodeURIComponent(router)}`
                break
            case 'traceroute':
                endpoint = `/lg/traceroute?target=${encodeURIComponent(target)}&router=${encodeURIComponent(router)}`
                break
            case 'route':
                endpoint = `/lg/routes/${encodeURIComponent(target)}?router=${encodeURIComponent(router)}`
                break
        }
        const resp = await makeRequest(t, endpoint)
        if (resp.success && resp.response) toolResult.value = resp.response
        else toolError.value = 'Query failed'
    } catch (e: any) {
        toolError.value = e?.message || 'Query error'
    } finally {
        toolLoading.value = false
    }
}

watch(selectedRouterUuid, (nv, ov) => {
    if (nv && nv !== ov && toolResult.value !== null) runTool()
})

const getStateColor = (state: string): string => {
    const s = state?.toLowerCase() || ''
    if (s === 'up' || s === 'established') return 'success'
    if (s === 'down') return 'error'
    if (s.includes('start') || s.includes('idle') || s.includes('connect') || s.includes('active')) return 'warning'
    return 'default'
}

onMounted(() => {
    registerPageTitle(t('pages.lg.title'))
    fetchRouters()
    fetchProtocols()
})
</script>

<template>
    <div class="lg-page">
        <div class="page-header">
            <h1 class="text-h4 font-weight-bold d-flex align-center justify-center ga-3 mb-1">
                <v-icon size="32" color="primary">mdi-magnify</v-icon>
                {{ t('pages.lg.title') }}
            </h1>
            <p class="text-body-1 text-medium-emphasis">{{ t('pages.lg.subtitle') }}</p>
        </div>

        <v-container style="max-width: 1200px">
            <v-card rounded="xl" elevation="0" border>
                <!-- Router Selection -->
                <div class="pa-4 pb-0">
                    <div class="text-body-2 text-medium-emphasis mb-3">
                        {{ t('pages.lg.selectNode') }}
                    </div>
                    <div v-if="routersLoading" class="d-flex justify-center pa-4">
                        <v-progress-circular indeterminate color="primary" size="24" />
                    </div>
                    <div v-else class="d-flex flex-wrap ga-2">
                        <v-card
                            v-for="router in routersList"
                            :key="router.uuid"
                            :variant="selectedRouterUuid === router.uuid ? 'elevated' : 'outlined'"
                            :color="selectedRouterUuid === router.uuid ? 'primary' : undefined"
                            rounded="lg"
                            class="router-chip px-3 py-2"
                            :class="{ 'selected': selectedRouterUuid === router.uuid }"
                            @click="selectedRouterUuid = router.uuid"
                            style="min-width: 160px; cursor: pointer"
                        >
                            <div class="d-flex align-center ga-2">
                                <v-avatar size="28" color="surface-variant" variant="tonal">
                                    <span class="text-caption font-weight-bold">{{ router.location }}</span>
                                </v-avatar>
                                <div class="flex-grow-1">
                                    <div class="text-body-2 font-weight-medium">{{ router.name }}</div>
                                    <div class="text-caption text-medium-emphasis">
                                        {{ router.sessionCount }} {{ t('pages.lg.sessions') }}
                                    </div>
                                </div>
                            </div>
                        </v-card>
                    </div>
                </div>

                <v-divider class="mt-4" />

                <!-- No router -->
                <div v-if="!selectedRouterUuid" class="text-center pa-8 text-medium-emphasis">
                    <v-icon size="48" class="mb-2">mdi-router-network</v-icon>
                    <p>{{ t('pages.lg.selectNodeFirst') }}</p>
                </div>

                <template v-else>
                    <!-- Tabs — MD3 Primary Tabs -->
                    <v-tabs
                        v-model="activeTab"
                        color="primary"
                        slider-color="primary"
                        align-tabs="center"
                    >
                        <v-tab value="protocols">
                            <v-icon start size="20">mdi-lan</v-icon>
                            {{ t('pages.lg.protocols') }}
                        </v-tab>
                        <v-tab value="tools">
                            <v-icon start size="20">mdi-tools</v-icon>
                            Tools
                        </v-tab>
                    </v-tabs>

                    <v-divider />

                    <v-window v-model="activeTab">
                        <!-- ============ PROTOCOLS ============ -->
                        <v-window-item value="protocols">
                            <v-card-text>
                                <div class="d-flex justify-end mb-4">
                                    <v-btn
                                        variant="tonal"
                                        size="small"
                                        rounded="lg"
                                        prepend-icon="mdi-refresh"
                                        @click="fetchProtocols"
                                    >
                                        {{ t('pages.lg.refresh') }}
                                    </v-btn>
                                </div>

                                <div v-if="protocolsLoading" class="d-flex justify-center align-center" style="min-height: 200px">
                                    <v-progress-circular indeterminate color="primary" size="40" />
                                </div>

                                <v-data-table
                                    v-else-if="hasLgData"
                                    :headers="protocolHeaders"
                                    :items="selectedRouterProtocols"
                                    hover
                                    density="compact"
                                    :items-per-page="-1"
                                    :hide-default-footer="true"
                                    :sort-by="[{ key: 'name', order: 'asc' }]"
                                    class="lg-table"
                                >
                                    <template #item.name="{ item }">
                                        <router-link
                                            :to="`/lg/${selectedRouterUuid}/${encodeURIComponent(item.name)}`"
                                            class="text-primary font-weight-medium font-mono"
                                            style="text-decoration: none"
                                        >
                                            {{ item.name }}
                                        </router-link>
                                    </template>
                                    <template #item.state="{ item }">
                                        <v-chip :color="getStateColor(item.state)" size="x-small" variant="tonal"
                                            class="font-weight-medium">
                                            {{ item.state }}
                                        </v-chip>
                                    </template>
                                    <template #no-data>
                                        <div class="text-center pa-4 text-medium-emphasis">
                                            <v-icon size="32" class="mb-1">mdi-lan-disconnect</v-icon>
                                            <p class="text-caption">{{ t('pages.lg.noProtocols') }}</p>
                                        </div>
                                    </template>
                                </v-data-table>

                                <div v-else class="text-center pa-8 text-medium-emphasis">
                                    <v-icon size="48" class="mb-2" color="warning">mdi-alert-circle-outline</v-icon>
                                    <p>{{ t('pages.lg.lgUnavailable') }}</p>
                                    <p class="text-caption mt-1">{{ selectedRouter?.name }}</p>
                                </div>
                            </v-card-text>
                        </v-window-item>

                        <!-- ============ TOOLS ============ -->
                        <v-window-item value="tools">
                            <v-card-text>
                                <!-- Not logged in -->
                                <div v-if="!hasAuth" class="text-center pa-8">
                                    <v-icon size="48" class="mb-2" color="warning">mdi-lock</v-icon>
                                    <p class="text-body-1">{{ t('pages.lg.authRequiredWarning') }}</p>
                                    <p class="text-caption text-medium-emphasis">
                                        Sign in to use Ping, Traceroute, and Route Lookup
                                    </p>
                                </div>

                                <template v-else>
                                    <!-- Query bar -->
                                    <div class="d-flex justify-center flex-wrap ga-2 mb-6">
                                        <v-select
                                            v-model="toolType"
                                            :items="toolOptions"
                                            item-title="title"
                                            item-value="value"
                                            variant="solo-filled"
                                            density="comfortable"
                                            hide-details
                                            bg-color="surface-container-high"
                                            rounded="pill"
                                            class="tool-type-select"
                                            :menu-props="{ contentClass: 'tool-type-dropdown' }"
                                        >
                                            <template #selection="{ item }">
                                                <v-icon size="16" class="mr-1">{{ selectedToolOption?.icon }}</v-icon>
                                                <span class="tool-type-label">{{ selectedToolOption?.title }}</span>
                                            </template>
                                            <template #item="{ item, props }">
                                                <v-list-item v-bind="props" rounded="xl" density="compact">
                                                    <template #prepend>
                                                        <v-icon size="16" class="mr-1">{{ (item as any).raw.icon }}</v-icon>
                                                    </template>
                                                </v-list-item>
                                            </template>
                                        </v-select>

                                        <v-text-field
                                            v-model="toolTarget"
                                            :placeholder="toolPlaceholder"
                                            variant="solo-filled"
                                            rounded="pill"
                                            density="comfortable"
                                            bg-color="surface-container-high"
                                            class="tool-input"
                                            hide-details
                                            append-inner-icon="mdi-magnify"
                                            @keyup.enter="runTool"
                                            @click:append-inner="runTool"
                                        />
                                    </div>

                                    <!-- Loading -->
                                    <div v-if="toolLoading" class="d-flex justify-center pa-8">
                                        <v-progress-circular
                                            indeterminate
                                            color="primary"
                                            size="48"
                                            width="4"
                                        />
                                    </div>

                                    <template v-else>
                                        <!-- Error -->
                                        <v-alert v-if="toolError" type="error" variant="tonal" density="compact"
                                            class="mb-4" rounded="lg">
                                            {{ toolError }}
                                        </v-alert>

                                    <!-- Ping result -->
                                    <v-card v-else-if="toolResult && toolType === 'ping'" rounded="xl" elevation="0"
                                        border class="mb-4">
                                        <v-card-text class="pa-4">
                                            <div class="d-flex align-center ga-2 mb-4">
                                                <v-icon color="primary">mdi-pulse</v-icon>
                                                <span class="text-body-1 font-weight-medium">Ping {{ toolResult.target }}</span>
                                            </div>
                                            <v-row>
                                                <v-col cols="6" sm="3">
                                                    <div class="text-caption text-medium-emphasis">Sent</div>
                                                    <div class="text-h6 font-weight-bold">{{ toolResult.packets_tx }}</div>
                                                </v-col>
                                                <v-col cols="6" sm="3">
                                                    <div class="text-caption text-medium-emphasis">Received</div>
                                                    <div class="text-h6 font-weight-bold">{{ toolResult.packets_rx }}</div>
                                                </v-col>
                                                <v-col cols="6" sm="3">
                                                    <div class="text-caption text-medium-emphasis">Loss</div>
                                                    <div class="text-h6 font-weight-bold"
                                                        :class="toolResult.loss_pct > 0 ? 'text-error' : 'text-success'">
                                                        {{ toolResult.loss_pct }}%
                                                    </div>
                                                </v-col>
                                                <v-col cols="6" sm="3" v-if="toolResult.avg_rtt_ms">
                                                    <div class="text-caption text-medium-emphasis">Avg RTT</div>
                                                    <div class="text-h6 font-weight-bold">{{ toolResult.avg_rtt_ms?.toFixed(2) }} ms</div>
                                                </v-col>
                                            </v-row>
                                            <div v-if="toolResult.min_rtt_ms" class="d-flex ga-4 mt-2">
                                                <span class="text-caption text-medium-emphasis">Min: {{ toolResult.min_rtt_ms?.toFixed(2) }} ms</span>
                                                <span class="text-caption text-medium-emphasis">Max: {{ toolResult.max_rtt_ms?.toFixed(2) }} ms</span>
                                            </div>
                                        </v-card-text>
                                    </v-card>

                                    <!-- Traceroute result -->
                                    <v-card v-else-if="toolResult && toolType === 'traceroute'" rounded="xl"
                                        elevation="0" border class="mb-4">
                                        <v-card-text class="pa-4">
                                            <div class="d-flex align-center ga-2 mb-4">
                                                <v-icon color="primary">mdi-map-marker-path</v-icon>
                                                <span class="text-body-1 font-weight-medium">Traceroute to {{ toolResult.target }}</span>
                                            </div>
                                            <div class="trace-table font-mono">
                                                <div class="trace-row trace-header">
                                                    <span class="trace-hop">Hop</span>
                                                    <span class="trace-ip">IP</span>
                                                    <span class="trace-rtt">RTT</span>
                                                </div>
                                                <div v-for="hop in toolResult.hops" :key="hop.hop" class="trace-row"
                                                    :class="{ 'trace-loss': hop.loss }">
                                                    <span class="trace-hop">{{ hop.hop }}</span>
                                                    <span class="trace-ip">{{ hop.ip || '*' }}</span>
                                                    <span class="trace-rtt">
                                                        <template v-if="hop.loss || !hop.rtt_ms">—</template>
                                                        <template v-else>{{ hop.rtt_ms?.toFixed(2) }} ms</template>
                                                    </span>
                                                </div>
                                            </div>
                                        </v-card-text>
                                    </v-card>

                                    <!-- Route result -->
                                    <v-card v-else-if="toolResult && toolType === 'route'" rounded="xl" elevation="0"
                                        border>
                                        <v-card-text class="pa-4">
                                            <div class="d-flex align-center ga-2 mb-4">
                                                <v-icon color="primary">mdi-table-network</v-icon>
                                                <span class="text-body-1 font-weight-medium">
                                                    {{ toolResult.prefix || toolResult.target || 'Routes' }}
                                                </span>
                                                <v-chip size="x-small" variant="tonal" color="primary" rounded="lg">
                                                    {{ toolResult.total || (toolResult.routes?.length || 0) }} entries
                                                </v-chip>
                                            </div>
                                            <v-data-table
                                                v-if="toolResult.routes && toolResult.routes.length > 0"
                                                :headers="routeHeaders"
                                                :items="toolResult.routes"
                                                hover
                                                density="compact"
                                                :items-per-page="-1"
                                                :hide-default-footer="true"
                                                :sort-by="[{ key: 'prefix', order: 'asc' }]"
                                                class="lg-table"
                                            >
                                                <template #item.prefix="{ item }">
                                                    <code class="font-mono text-body-2">{{ (item as any).prefix }}</code>
                                                </template>
                                                <template #item.interface="{ item }">
                                                    <v-chip v-if="(item as any).interface" size="x-small" variant="flat" color="primary" rounded="lg">
                                                        {{ (item as any).interface }}
                                                    </v-chip>
                                                    <span v-else class="text-medium-emphasis">—</span>
                                                </template>
                                                <template #item.type="{ item }">
                                                    <span class="text-body-2">{{ (item as any).type || '—' }}</span>
                                                </template>
                                                <template #no-data>
                                                    <div class="text-center pa-4 text-medium-emphasis">
                                                        <p class="text-caption">{{ t('pages.lg.noRoutes') || 'No routes found' }}</p>
                                                    </div>
                                                </template>
                                            </v-data-table>
                                            <div v-else class="text-center pa-6 text-medium-emphasis">
                                                <p class="text-caption">{{ t('pages.lg.noRoutes') || 'No routes found' }}</p>
                                            </div>
                                        </v-card-text>
                                    </v-card>

                                    <!-- Empty state -->
                                    <div v-else class="text-center pa-10 text-medium-emphasis">
                                        <v-icon size="48" class="mb-2">mdi-console-line</v-icon>
                                        <p>Enter a target IP or prefix and click Query</p>
                                    </div>
                                    </template>
                                </template>
                            </v-card-text>
                        </v-window-item>
                    </v-window>
                </template>
            </v-card>
        </v-container>
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

.lg-table :deep(.v-data-table__tr) {
    height: 40px;
}

.lg-table :deep(.v-data-table__td) {
    padding: 4px 12px !important;
}

.lg-table :deep(.v-data-table-footer) {
    display: none;
}

.router-chip {
    transition: all 0.2s ease;
    border-width: 2px;
}

.router-chip:hover {
    border-color: rgb(var(--v-theme-primary));
    background: rgba(var(--v-theme-primary), 0.04);
}

.router-chip.selected {
    background: rgba(var(--v-theme-primary), 0.08);
}

.font-mono {
    font-family: 'Roboto Mono', 'SF Mono', 'Fira Code', monospace;
    font-size: 0.9em;
}

/* Tools — query input pill */
.tool-input {
    max-width: 500px;
    min-width: 200px;
    flex: 1 1 auto;
}

.tool-input :deep(.v-field) {
    box-shadow: none !important;
}

/* Tool type selector — standalone pill dropdown */
.tool-type-select {
    max-width: 150px;
}

.tool-type-label {
    font-size: 13px;
    font-weight: 500;
}

/* Traceroute table */
.trace-table {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.trace-row {
    display: grid;
    grid-template-columns: 52px 1fr 90px;
    gap: 8px;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 13px;
}

.trace-header {
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: rgb(var(--v-theme-on-surface-variant));
    background: rgb(var(--v-theme-surface-container-low));
}

.trace-loss {
    color: rgb(var(--v-theme-error));
}

.trace-hop,
.trace-ip,
.trace-rtt {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* Fix dropdown item borders */
.v-select__content .v-list-item--variant-text {
    border-radius: 0.75rem !important;
}
</style>

<style>
/* Override Vuetify's default .v-menu > .v-overlay__content { border-radius: 4px }
   which beats plain .tool-type-dropdown (specificity 0,2,0 vs 0,1,0). */
.tool-type-dropdown {
    border-radius: 12px !important;
}

/* Replace Vuetify's three-layer shadow (positive spread = wider than menu)
   with a clean no-spread shadow that follows the exact 12px rounded corners. */
.v-overlay__content.tool-type-dropdown .v-sheet,
.v-overlay__content.tool-type-dropdown .v-list {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12) !important;
}

/* Spacer between icon and text — the user pointed out v-list-item__spacer */
.tool-type-dropdown .v-list-item__spacer {
    display: none;
}
/* No post-icon padding */
.tool-type-dropdown .v-list-item__prepend {
    padding-inline-end: 0;
}
</style>
