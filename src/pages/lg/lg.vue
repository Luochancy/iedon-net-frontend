<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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

// State
const routersLoading = ref(false)
const protocolsLoading = ref(false)

// Router list (from /list/routers)
const routersList = ref<RouterInfo[]>([])
const selectedRouterUuid = ref<string | null>(null)

// Protocols
const routerData = ref<RouterProtocols[]>([])

// Computed: selected router info
const selectedRouter = computed<RouterInfo | undefined>(() => {
    return routersList.value.find(r => r.uuid === selectedRouterUuid.value)
})

// Computed: protocols for selected router from /lg/protocols data
const selectedRouterProtocols = computed<BgpProtocol[]>(() => {
    if (!selectedRouterUuid.value) return []
    const r = routerData.value.find(r => r.routerUuid === selectedRouterUuid.value)
    return r?.protocols || []
})

// Computed: does the selected router have LG available?
const hasLgData = computed(() => selectedRouterProtocols.value.length > 0)

// Protocols table headers
const protocolHeaders = [
    { title: t('pages.lg.name'), key: 'name', sortable: true },
    { title: t('pages.lg.protocol'), key: 'proto', sortable: true },
    { title: t('pages.lg.state'), key: 'state', sortable: true },
    { title: t('pages.lg.since'), key: 'since', sortable: true },
    { title: t('pages.lg.info'), key: 'info', sortable: false },
]

// Fetch router list (public)
const fetchRouters = async () => {
    routersLoading.value = true
    try {
        const resp = await makeRequest(t, '/list/routers', undefined, true)
        if (resp.success && resp.response) {
            const data = resp.response as { routers: RouterInfo[] }
            if (data.routers && Array.isArray(data.routers)) {
                routersList.value = data.routers
                // Auto-select first router if none selected
                if (!selectedRouterUuid.value && data.routers.length > 0) {
                    selectedRouterUuid.value = data.routers[0].uuid
                }
            }
        }
    } catch (e) {
        console.error(e)
        showSnackbar('Failed to load routers', 'error')
    } finally {
        routersLoading.value = false
    }
}

// Fetch protocols (public, no auth needed)
const fetchProtocols = async () => {
    protocolsLoading.value = true
    routerData.value = []
    try {
        const resp = await makeRequest(t, '/lg/protocols', undefined, true)
        if (resp.success && resp.response) {
            const data = resp.response as unknown as { routers: RouterProtocols[] }
            if (data.routers && Array.isArray(data.routers)) {
                routerData.value = data.routers
            }
        }
    } catch (e) {
        console.error(e)
        showSnackbar(t('pages.lg.loadProtocolsFailed'), 'error')
    } finally {
        protocolsLoading.value = false
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
    fetchRouters()
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

                <!-- No router selected state -->
                <div v-if="!selectedRouterUuid" class="text-center pa-8 text-medium-emphasis">
                    <v-icon size="48" class="mb-2">mdi-router-network</v-icon>
                    <p>{{ t('pages.lg.selectNodeFirst') }}</p>
                </div>

                <template v-else>
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

                        <!-- Loading -->
                        <div v-if="protocolsLoading" class="d-flex justify-center align-center" style="min-height: 200px">
                            <v-progress-circular indeterminate color="primary" size="40" />
                        </div>

                        <!-- Protocol data available -->
                        <template v-else-if="hasLgData">
                            <v-data-table
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
                                        style="text-decoration: underline"
                                    >
                                        {{ item.name }}
                                    </router-link>
                                </template>

                                <template #item.state="{ item }">
                                    <v-chip
                                        :color="getStateColor(item.state)"
                                        size="x-small"
                                        variant="tonal"
                                        class="font-weight-medium"
                                    >
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
                        </template>

                        <!-- LG unavailable for this node -->
                        <div v-else class="text-center pa-8 text-medium-emphasis">
                            <v-icon size="48" class="mb-2" color="warning">mdi-alert-circle-outline</v-icon>
                            <p>{{ t('pages.lg.lgUnavailable') }}</p>
                            <p class="text-caption mt-1">{{ selectedRouter?.name }}</p>
                        </div>
                    </v-card-text>
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
</style>
