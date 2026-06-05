<script setup lang="ts">
import { computed, onMounted, onUnmounted, Ref, ref, watch, WatchHandle } from 'vue'
import { RouteLocationAsPathGeneric, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { makeRequest, RouterMetadata, RoutersResponse } from '../../common/packetHandler'
import { loggedIn, formatBytes, siteConfig, registerPageTitle, showSnackbar } from '../../common/helper'
import RouterLocationAvatar from '../../components/RouterLocationAvatar.vue'

//@ts-ignore
import markdown_it from 'markdown-it'
//@ts-ignore
import mila from 'markdown-it-link-attributes'

const showErrorDialog = ref(false)
const errorDialogTitle = ref('')
const errorDialogContent = ref('')

const showError = (title: string, content: string) => {
    errorDialogTitle.value = title
    errorDialogContent.value = content
    showErrorDialog.value = true
}

const t = useI18n().t
const router = useRouter()

const md = new markdown_it()
md.use(mila, {
    attrs: {
        target: "_blank"
    },
})

const loading = ref(false)
const routers: Ref<RouterMetadata[]> = ref([])
const expandedMetrics = ref<Set<string>>(new Set())
const searchKeywords = ref('')
const selectedRegion = ref<string>('all')
const LAYOUT_STORAGE_KEY = 'nodesLayoutMode'
const layoutMode = ref<'list' | 'grid'>('list')
const isListView = computed(() => layoutMode.value === 'list')

// Region mapping configuration - optimized for performance
const REGION_MAPPING = new Map([
    // Europe
    ['AD', 'Europe'], ['AL', 'Europe'], ['AT', 'Europe'], ['BA', 'Europe'], ['BE', 'Europe'], ['BG', 'Europe'],
    ['BY', 'Europe'], ['CH', 'Europe'], ['CZ', 'Europe'], ['DE', 'Europe'], ['DK', 'Europe'], ['EE', 'Europe'],
    ['ES', 'Europe'], ['FI', 'Europe'], ['FR', 'Europe'], ['GB', 'Europe'], ['GR', 'Europe'], ['HR', 'Europe'],
    ['HU', 'Europe'], ['IE', 'Europe'], ['IS', 'Europe'], ['IT', 'Europe'], ['LI', 'Europe'], ['LT', 'Europe'],
    ['LU', 'Europe'], ['LV', 'Europe'], ['MC', 'Europe'], ['MD', 'Europe'], ['ME', 'Europe'], ['MK', 'Europe'],
    ['MT', 'Europe'], ['NL', 'Europe'], ['NO', 'Europe'], ['PL', 'Europe'], ['PT', 'Europe'], ['RO', 'Europe'],
    ['RS', 'Europe'], ['SE', 'Europe'], ['SI', 'Europe'], ['SK', 'Europe'], ['SM', 'Europe'], ['UA', 'Europe'],
    ['VA', 'Europe'], ['XK', 'Europe'],

    // North America
    ['US', 'North America'], ['CA', 'North America'], ['MX', 'North America'], ['GT', 'North America'],
    ['BZ', 'North America'], ['SV', 'North America'], ['HN', 'North America'], ['NI', 'North America'],
    ['CR', 'North America'], ['PA', 'North America'],

    // South America
    ['AR', 'South America'], ['BO', 'South America'], ['BR', 'South America'], ['CL', 'South America'],
    ['CO', 'South America'], ['EC', 'South America'], ['FK', 'South America'], ['GF', 'South America'],
    ['GY', 'South America'], ['PE', 'South America'], ['PY', 'South America'], ['SR', 'South America'],
    ['UY', 'South America'], ['VE', 'South America'],

    // Africa
    ['DZ', 'Africa'], ['AO', 'Africa'], ['BW', 'Africa'], ['BI', 'Africa'], ['CM', 'Africa'], ['CV', 'Africa'],
    ['CF', 'Africa'], ['TD', 'Africa'], ['KM', 'Africa'], ['YT', 'Africa'], ['CG', 'Africa'], ['CD', 'Africa'],
    ['BJ', 'Africa'], ['GQ', 'Africa'], ['ET', 'Africa'], ['ER', 'Africa'], ['DJ', 'Africa'], ['GA', 'Africa'],
    ['GM', 'Africa'], ['GH', 'Africa'], ['GN', 'Africa'], ['CI', 'Africa'], ['KE', 'Africa'], ['LS', 'Africa'],
    ['LR', 'Africa'], ['LY', 'Africa'], ['MG', 'Africa'], ['MW', 'Africa'], ['ML', 'Africa'], ['MR', 'Africa'],
    ['MU', 'Africa'], ['MA', 'Africa'], ['MZ', 'Africa'], ['NA', 'Africa'], ['NE', 'Africa'], ['NG', 'Africa'],
    ['GW', 'Africa'], ['RE', 'Africa'], ['RW', 'Africa'], ['SH', 'Africa'], ['ST', 'Africa'], ['SN', 'Africa'],
    ['SC', 'Africa'], ['SL', 'Africa'], ['SO', 'Africa'], ['ZA', 'Africa'], ['ZW', 'Africa'], ['SS', 'Africa'],
    ['SD', 'Africa'], ['SZ', 'Africa'], ['TG', 'Africa'], ['TN', 'Africa'], ['UG', 'Africa'], ['EH', 'Africa'],
    ['ZM', 'Africa'], ['TZ', 'Africa'], ['BF', 'Africa'], ['EG', 'Africa'],

    // Asia-S (South Asia)
    ['IN', 'Asia-S'], ['PK', 'Asia-S'], ['BD', 'Asia-S'], ['LK', 'Asia-S'], ['NP', 'Asia-S'], ['BT', 'Asia-S'],
    ['MV', 'Asia-S'],

    // Asia-SE (Southeast Asia)
    ['TH', 'Asia-SE'], ['SG', 'Asia-SE'], ['PH', 'Asia-SE'], ['ID', 'Asia-SE'], ['MY', 'Asia-SE'],
    ['VN', 'Asia-SE'], ['KH', 'Asia-SE'], ['LA', 'Asia-SE'], ['MM', 'Asia-SE'], ['BN', 'Asia-SE'],
    ['TL', 'Asia-SE'],

    // Asia-E (East Asia)
    ['JP', 'Asia-E'], ['CN', 'Asia-E'], ['KR', 'Asia-E'], ['TW', 'Asia-E'], ['HK', 'Asia-E'], ['MO', 'Asia-E'],
    ['KP', 'Asia-E'], ['MN', 'Asia-E'],

    // Pacific & Oceania
    ['AU', 'Pacific&Oceania'], ['NZ', 'Pacific&Oceania'], ['FJ', 'Pacific&Oceania'], ['PG', 'Pacific&Oceania'],
    ['NC', 'Pacific&Oceania'], ['SB', 'Pacific&Oceania'], ['VU', 'Pacific&Oceania'], ['WS', 'Pacific&Oceania'],
    ['KI', 'Pacific&Oceania'], ['NR', 'Pacific&Oceania'], ['PW', 'Pacific&Oceania'], ['FM', 'Pacific&Oceania'],
    ['MH', 'Pacific&Oceania'], ['TO', 'Pacific&Oceania'], ['TV', 'Pacific&Oceania'], ['CK', 'Pacific&Oceania'],
    ['NU', 'Pacific&Oceania'], ['TK', 'Pacific&Oceania'], ['WF', 'Pacific&Oceania'], ['AS', 'Pacific&Oceania'],
    ['GU', 'Pacific&Oceania'], ['MP', 'Pacific&Oceania'], ['UM', 'Pacific&Oceania'], ['PF', 'Pacific&Oceania'],

    // Antarctica
    ['AQ', 'Antarctica'],

    // Asia-N (North Asia)
    ['RU', 'Asia-N'],

    // Asia-W (West Asia)
    ['IR', 'Asia-W'], ['TR', 'Asia-W'], ['AE', 'Asia-W'], ['SA', 'Asia-W'], ['IQ', 'Asia-W'], ['SY', 'Asia-W'],
    ['LB', 'Asia-W'], ['JO', 'Asia-W'], ['IL', 'Asia-W'], ['PS', 'Asia-W'], ['KW', 'Asia-W'], ['QA', 'Asia-W'],
    ['BH', 'Asia-W'], ['OM', 'Asia-W'], ['YE', 'Asia-W'], ['GE', 'Asia-W'], ['AM', 'Asia-W'], ['AZ', 'Asia-W'],
    ['CY', 'Asia-W'],

    // Central Asia
    ['AF', 'Central Asia'], ['UZ', 'Central Asia'], ['KZ', 'Central Asia'], ['KG', 'Central Asia'],
    ['TJ', 'Central Asia'], ['TM', 'Central Asia']
])

// Get router region - optimized for performance
const getRouterRegion = (router: RouterMetadata): string => {
    if (!router.location) return 'Other Region'
    return REGION_MAPPING.get(router.location.toUpperCase()) || 'Other Region'
}

const getRouterRegionLabel = (router: RouterMetadata): string => {
    const regionKey = getRouterRegion(router)
    const translationKey = `pages.nodes.regions.${regionKey}`
    const translated = t(translationKey)
    return translated !== translationKey ? translated : regionKey
}

const fetchRouters = async () => {
    try {
        loading.value = true
        let resp = await makeRequest(t, '/list/routers')
        if (resp.success && resp.response) {
            const data = resp.response as RoutersResponse
            if (data && Array.isArray(data.routers)) {
                routers.value = data.routers.sort((a, b) => ('' + a.name).localeCompare(b.name))
                localStorage.setItem('routers', JSON.stringify(routers.value))
            }
        }

    } catch (error) {
        console.error(error)
    } finally {
        loading.value = false
    }
}

let layoutWatchHandler: WatchHandle | null = null
onMounted(async () => {
    registerPageTitle(t('pages.nodes.nodes'))
    try {
        const oldRouters = localStorage.getItem('routers')
        if (oldRouters) routers.value = JSON.parse(oldRouters)
        const savedLayout = localStorage.getItem(LAYOUT_STORAGE_KEY)
        if (savedLayout === 'grid' || savedLayout === 'list') {
            layoutMode.value = savedLayout
        }
    } catch (error) {
        console.error(error)
    }
    layoutWatchHandler = watch(layoutMode, (mode) => {
        try {
            localStorage.setItem(LAYOUT_STORAGE_KEY, mode)
        } catch (error) {
            console.error(error)
        }
    })
    await fetchRouters()
})

onUnmounted(() => {
    if (layoutWatchHandler) {
        layoutWatchHandler()
        layoutWatchHandler = null
    }
})


// Helper function to check if router is offline (last update > 15 minutes ago)
const isRouterOffline = (r: RouterMetadata) => {
    if (!r.metric || !r.metric.timestamp) return true
    const now = (+Date.now()) / 1000 // Convert to seconds
    const routerTimestamp = r.metric.timestamp / 1000 // Convert to seconds
    const fifteenMinutesAgo = now - (15 * 60) // 15 minutes in seconds
    return routerTimestamp < fifteenMinutesAgo
}

// Helper function to check if site is in maintenance mode
const isMaintenanceMode = () => {
    return siteConfig.value.maintenanceText && siteConfig.value.maintenanceText.trim() !== ''
}

const redirectToPeering = (r: RouterMetadata, linkType?: string) => {
    // Check maintenance mode first
    if (isMaintenanceMode()) {
        showError(t('pages.nodes.maintenanceMode'), siteConfig.value.maintenanceText)
        return
    }

    // Check if router is offline
    if (isRouterOffline(r)) {
        showError(t('pages.nodes.routerOffline'), t('pages.nodes.routerOfflineDescription'))
        return
    }

    if (!r.openPeering) {
        showError(r.name, t('pages.nodes.statusClosed'))
        return
    }
    if (r.sessionCount >= r.sessionCapacity) {
        showError(r.name, t('pages.nodes.statusFull'))
        return
    }
    if (!loggedIn.value) {
        showSnackbar(t('pages.nodes.pleaseSignIn'), 'info')
        router.replace({ path: '/signin' })
        return
    }

    const route: RouteLocationAsPathGeneric = { path: `/nodes/${r.uuid}` }
    if (linkType) {
        route.query = { linkType }
    }
    router.push(route)
}

// Computed properties for filtering
const regionCounts = computed(() => {
    const counts: Record<string, number> = {}
    routers.value.forEach(router => {
        const region = getRouterRegion(router)
        counts[region] = (counts[region] || 0) + 1
    })
    return counts
})

const availableRegions = computed(() => {
    const regions = Object.keys(regionCounts.value)
        .filter(region => region !== 'Unknown')
        .sort()
    return regions
})

const filteredRouters = computed(() => {
    let filtered = routers.value

    // Filter by region
    if (selectedRegion.value !== 'all') {
        filtered = filtered.filter(router => getRouterRegion(router) === selectedRegion.value)
    }

    // Filter by search keywords
    if (searchKeywords.value.length > 0) {
        const keywords = searchKeywords.value.toLowerCase()
        filtered = filtered.filter(router =>
            (router.name?.toLowerCase().includes(keywords)) ||
            (router.ipv4?.includes(searchKeywords.value)) ||
            (router.ipv6?.toLowerCase().includes(keywords)) ||
            (router.ipv6LinkLocal?.toLowerCase().includes(keywords))
        )
    }

    return filtered
})

// Helper functions for better formatting
const getStatusInfo = (r: RouterMetadata) => {
    if (!r.openPeering) {
        return {
            status: t('pages.nodes.statusClosed'),
            color: 'default',
            icon: 'mdi-stop-circle-outline'
        }
    }
    if (r.sessionCount >= r.sessionCapacity) {
        return {
            status: t('pages.nodes.statusFull'),
            color: 'warning',
            icon: 'mdi-alert-circle-outline'
        }
    }
    if (r.autoPeering) {
        return {
            status: t('pages.nodes.statusOpen'),
            color: 'success',
            icon: 'mdi-check-circle-outline'
        }
    }
    return {
        status: t('pages.nodes.statusOpenManuallyReview'),
        color: 'processing',
        icon: 'mdi-timer-sand'
    }
}

const formatUptime = (uptime: number) => {
    const days = Math.floor(uptime / 86400)
    const hours = Math.floor((uptime % 86400) / 3600)
    return `${days}d ${hours}h`
}

const getRouterInfo = (rs: string) => {
    if (!rs) return 'N/A'
    const lines = rs.split('\n')
    for (const line of lines) {
        if (line.includes('BIRD')) {
            return line.trim()
        }
    }
    return lines[0]?.trim() || 'N/A'
}

const getAgentVersion = (versionString: string) => {
    if (!versionString) return 'N/A'
    // Extract version from strings like "iEdon-PeerAPI-Agent/1.0 (xxx)"
    const match = versionString.match(/\/([0-9.]+)/)
    return match ? match[1] : 'N/A'
}

const getConnectionTypeLabel = (linkType: string) => {
    const key = `pages.peering.${linkType}`
    const translated = t(key)
    // If translation not found, return original string in title case
    return translated !== key ? translated : linkType.charAt(0).toUpperCase() + linkType.slice(1)
}

const getConnectionIcon = (linkType: string) => {
    const iconMap: { [key: string]: string } = {
        'wireguard': 'mdi-lightning-bolt',
        'openvpn': 'mdi-web',
        'ipsec': 'mdi-database',
        'gre': 'mdi-wifi',
        'ip6gre': 'mdi-wifi',
        'direct': 'mdi-lan-connect'
    }
    return iconMap[linkType] || 'mdi-wifi'
}

const getConnectionBadgeClass = (linkType: string) => {
    const classMap: { [key: string]: string } = {
        'wireguard': 'wireguard',
        'openvpn': 'openvpn',
        'ipsec': 'ipsec',
        'gre': 'gre',
        'ip6gre': 'gre',
        'direct': 'direct'
    }
    return classMap[linkType] || 'default'
}

// Statistics computed properties
const totalRouters = computed(() => filteredRouters.value.length)
const totalSessions = computed(() => filteredRouters.value.reduce((sum, r) => sum + r.sessionCount, 0))
const availableForAuto = computed(() => filteredRouters.value.filter(r => r.openPeering && r.autoPeering && r.sessionCount < r.sessionCapacity).length)

// Toggle metrics visibility
const toggleMetrics = (routerId: string, event: Event) => {
    event.stopPropagation() // Prevent card click
    if (expandedMetrics.value.has(routerId)) {
        expandedMetrics.value.delete(routerId)
    } else {
        expandedMetrics.value.add(routerId)
    }
}

const isMetricsExpanded = (routerId: string) => {
    return expandedMetrics.value.has(routerId)
}

// Region filter helpers
const setRegionFilter = (region: string) => {
    selectedRegion.value = region
    // Clear search when changing region for better UX
    if (region !== 'all' && searchKeywords.value) {
        searchKeywords.value = ''
    }
}

const setLayoutMode = (mode: 'list' | 'grid') => {
    layoutMode.value = mode
}
</script>

<template>
    <div class="nodes-page">
        <!-- Header Section -->
        <div class="page-header">
            <h1 class="text-h4 font-weight-bold d-flex align-center justify-center ga-3 mb-1">
                <v-icon size="32" color="primary">mdi-server</v-icon>
                {{ t('pages.nodes.nodes') }}
            </h1>
            <p class="text-body-1 text-medium-emphasis">{{ t('pages.nodes.subTitle') }}</p>
        </div>

        <!-- Search Section -->
        <div class="d-flex justify-center align-center flex-wrap ga-3 mb-6">
            <v-text-field v-model="searchKeywords" :placeholder="t('pages.nodes.search')"
                class="search-input" variant="solo-filled" rounded="pill" density="comfortable"
                bg-color="surface-container-high"
                prepend-inner-icon="mdi-magnify" :disabled="loading" hide-details flat />
            <div class="layout-toggle">
                <v-btn icon size="small"
                    :color="isListView ? 'primary' : 'default'"
                    :variant="isListView ? 'flat' : 'outlined'"
                    :disabled="loading" @click="setLayoutMode('list')"
                    :title="t('pages.nodes.listView')"
                    :aria-label="t('pages.nodes.listView')">
                    <v-icon>mdi-view-headline</v-icon>
                </v-btn>
                <v-btn icon size="small"
                    :color="!isListView ? 'primary' : 'default'"
                    :variant="!isListView ? 'flat' : 'outlined'"
                    :disabled="loading" @click="setLayoutMode('grid')"
                    :title="t('pages.nodes.gridView')"
                    :aria-label="t('pages.nodes.gridView')">
                    <v-icon>mdi-view-grid</v-icon>
                </v-btn>
            </div>
        </div>

        <!-- Region Filter Section -->
        <div v-if="!loading && routers.length > 0" class="d-flex justify-center mb-6">
            <div class="d-flex flex-wrap ga-2 justify-center align-center" style="max-width: 900px; width: 100%;">
                <v-btn size="small" rounded="pill"
                    :color="selectedRegion === 'all' ? 'primary' : 'default'"
                    :variant="selectedRegion === 'all' ? 'flat' : 'outlined'"
                    @click="setRegionFilter('all')">
                    {{ t('pages.nodes.regions.All') }} ({{ routers.length }})
                </v-btn>
                <v-btn v-for="region in availableRegions" :key="region" size="small" rounded="pill"
                    :color="selectedRegion === region ? 'primary' : 'default'"
                    :variant="selectedRegion === region ? 'flat' : 'outlined'"
                    @click="setRegionFilter(region)">
                    {{ t(`pages.nodes.regions.${region}`) }} ({{ regionCounts[region] }})
                </v-btn>
            </div>
        </div>

        <!-- Loading State with Skeletons -->
        <div v-if="loading">
            <!-- Routers Grid Skeleton -->
            <div class="routers-grid">
                <div v-for="i in 6" :key="i" class="router-card skeleton-card">
                    <!-- Card Header Skeleton -->
                    <div class="card-header">
                        <div class="router-info">
                            <v-skeleton-loader type="avatar" />
                            <div class="router-title">
                                <v-skeleton-loader type="text" style="width: 200px; height: 24px; margin-bottom: 8px;" />
                                <v-skeleton-loader type="text" style="width: 120px; height: 16px;" />
                            </div>
                        </div>
                        <div class="card-actions">
                            <v-skeleton-loader type="button" />
                            <v-skeleton-loader type="button" />
                        </div>
                    </div>

                    <!-- Capacity Section Skeleton -->
                    <div class="capacity-section">
                        <div class="capacity-info">
                            <v-skeleton-loader type="avatar" />
                            <v-skeleton-loader type="text" style="width: 80px; height: 16px;" />
                        </div>
                        <v-skeleton-loader type="text" style="width: 100%; height: 8px; border-radius: 4px;" />
                    </div>

                    <!-- Connection Section Skeleton -->
                    <div class="connection-section">
                        <div class="connection-badges">
                            <v-skeleton-loader v-for="j in 3" :key="j" type="button"
                                style="width: 80px; margin-right: 8px;" />
                        </div>
                    </div>

                    <!-- Metrics Section Skeleton -->
                    <div class="metrics-section">
                        <v-skeleton-loader type="button"
                            style="width: 120px; height: 32px; border-radius: 8px;" />
                    </div>
                </div>
            </div>
        </div>

        <!-- Routers Grid -->
        <div v-else-if="filteredRouters.length > 0">
            <div v-if="isListView" class="router-list">
                <div v-for="r in filteredRouters" :key="r.uuid" class="router-row" @click="redirectToPeering(r)">
                    <div class="router-row-left">
                        <router-location-avatar :router="r"
                            :color="isRouterOffline(r) || isMaintenanceMode() ? 'red' : ''" class="router-row-avatar" />
                        <div class="router-row-details">
                            <h3 class="router-name">{{ r.name }}</h3>
                            <div class="router-row-meta">
                                <span>{{ getRouterRegionLabel(r) }}</span>
                                <span class="router-row-dot">•</span>
                                <span :class="['status-chip', getStatusInfo(r).color]">
                                    {{ getStatusInfo(r).status }}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="router-row-capacity">
                        <v-icon size="16" color="primary" class="row-capacity-icon">mdi-account-group</v-icon>
                        <span>{{ r.sessionCount }} / {{ r.sessionCapacity }}</span>
                        <v-progress-linear
                            :model-value="Math.round((r.sessionCount / r.sessionCapacity) * 100)"
                            :color="r.sessionCount >= r.sessionCapacity ? 'error' : 'success'"
                            height="4" rounded />
                    </div>
                    <div v-if="r.linkTypes && r.linkTypes.length" class="router-row-links">
                        <div v-for="linkType in (r.linkTypes || []).slice(0, 3)" :key="`${r.uuid}-${linkType}`"
                            class="connection-badge" :class="getConnectionBadgeClass(linkType)"
                            @click.stop="redirectToPeering(r, linkType)">
                            <v-icon size="14" class="connection-badge-icon">{{ getConnectionIcon(linkType) }}</v-icon>
                            <span class="connection-badge-text">{{ getConnectionTypeLabel(linkType) }}</span>
                        </div>
                        <span v-if="r.linkTypes.length > 3" class="router-row-extra">
                            +{{ r.linkTypes.length - 3 }}
                        </span>
                    </div>
                    <div class="router-row-actions">
                        <v-tooltip :text="t('pages.nodes.connect')">
                            <template #activator="{ props: tooltipProps }">
                                <v-btn v-bind="tooltipProps" color="primary" size="small"
                                    @click.stop="redirectToPeering(r)"
                                    :aria-label="t('pages.nodes.connect')">
                                    <v-icon>mdi-link</v-icon>
                                </v-btn>
                            </template>
                        </v-tooltip>
                    </div>
                </div>
            </div>
            <div v-else class="routers-grid">
                <div v-for="r in filteredRouters" :key="r.uuid" class="router-card" @click="redirectToPeering(r)">
                <!-- Card Header -->
                <div class="card-header">
                    <div class="router-info">
                        <router-location-avatar :router="r"
                            :color="isRouterOffline(r) || isMaintenanceMode() ? 'red' : ''" class="router-avatar" />
                        <div class="router-title">
                            <h3 class="router-name">{{ r.name }}</h3>
                            <div class="status-indicator" :class="getStatusInfo(r).color">
                                <v-icon size="12" class="status-icon">{{ getStatusInfo(r).icon }}</v-icon>
                                <span class="status-text">{{ getStatusInfo(r).status }}</span>
                            </div>
                        </div>
                    </div>
                    <div class="card-actions">
                        <v-tooltip :text="t('pages.nodes.connect')">
                            <template #activator="{ props: tooltipProps }">
                                <v-btn v-bind="tooltipProps" variant="text" size="small" icon
                                    @click.stop="redirectToPeering(r)"
                                    :aria-label="t('pages.nodes.connect')">
                                    <v-icon>mdi-link</v-icon>
                                </v-btn>
                            </template>
                        </v-tooltip>
                    </div>
                </div>

                <!-- Capacity Section -->
                <div class="capacity-section">
                    <div class="capacity-info">
                        <v-icon size="16" color="primary" class="capacity-icon">mdi-account-group</v-icon>
                        <span class="capacity-text">
                            {{ r.sessionCount }} / {{ r.sessionCapacity }}
                        </span>
                    </div>
                    <v-progress-linear
                        :model-value="Math.round((r.sessionCount / r.sessionCapacity) * 100)"
                        :color="r.sessionCount >= r.sessionCapacity ? 'error' : 'success'"
                        height="4" rounded />
                </div>
                
                <!-- Connection Options -->
                <div v-if="r.linkTypes && r.linkTypes.length > 0" class="connection-section">
                    <div class="connection-badges">
                        <div v-for="linkType in r.linkTypes" :key="linkType" class="connection-badge"
                            @click.stop="redirectToPeering(r, linkType)"
                            :class="getConnectionBadgeClass(linkType)">
                            <v-icon size="14" class="connection-badge-icon">{{ getConnectionIcon(linkType) }}</v-icon>
                            <span class="connection-badge-text">{{ getConnectionTypeLabel(linkType) }}</span>
                        </div>
                    </div>
                </div>

                <!-- Metrics Section (if available) -->
                <div v-if="r.metric" class="metrics-section">
                    <!-- Metrics Toggle Button -->
                    <div class="metrics-toggle" @click="toggleMetrics(r.uuid, $event)">
                        <span class="metrics-toggle-text">
                            {{ t('pages.nodes.systemMetrics') }}
                        </span>
                        <v-icon size="12" class="metrics-toggle-icon" :class="{ 'expanded': isMetricsExpanded(r.uuid) }">mdi-chevron-down</v-icon>
                    </div>

                    <!-- Collapsible Metrics Content -->
                    <div v-show="isMetricsExpanded(r.uuid)" class="metrics-content">
                        <div class="metrics-grid">
                            <div class="metric-item">
                                <v-icon size="12" color="primary" class="metric-icon">mdi-clock-outline</v-icon>
                                <div class="metric-content">
                                    <span class="metric-label">{{ t('pages.nodes.uptime') }}</span>
                                    <span class="metric-value">{{ formatUptime(r.metric.uptime) }}</span>
                                </div>
                            </div>
                            <div class="metric-item">
                                <v-icon size="12" color="primary" class="metric-icon">mdi-lightning-bolt</v-icon>
                                <div class="metric-content">
                                    <span class="metric-label">{{ t('pages.nodes.loadAvg') }}</span>
                                    <span class="metric-value">{{ r.metric.loadAvg?.split(' ')[0] || 'N/A' }}</span>
                                </div>
                            </div>
                            <div class="metric-item">
                                <v-icon size="12" color="primary" class="metric-icon">mdi-wifi</v-icon>
                                <div class="metric-content">
                                    <span class="metric-label">{{ t('pages.nodes.txRx') }}</span>
                                    <span class="metric-value">{{ formatBytes(r.metric.tx) }} / {{ formatBytes(r.metric.rx) }}</span>
                                </div>
                            </div>
                            <div class="metric-item">
                                <v-icon size="12" color="primary" class="metric-icon">mdi-web</v-icon>
                                <div class="metric-content">
                                    <span class="metric-label">{{ t('pages.nodes.tcpUdp') }}</span>
                                    <span class="metric-value">{{ r.metric.tcp || 0 }} / {{ r.metric.udp || 0 }}</span>
                                </div>
                            </div>
                            <div v-if="r.metric.rs" class="metric-item">
                                <v-icon size="12" color="primary" class="metric-icon">mdi-router-wireless</v-icon>
                                <div class="metric-content">
                                    <span class="metric-label">{{ t('pages.nodes.router') }}</span>
                                    <span class="metric-value">{{ getRouterInfo(r.metric.rs) }}</span>
                                </div>
                            </div>
                            <div v-if="r.metric.version" class="metric-item">
                                <v-icon size="12" color="primary" class="metric-icon">mdi-monitor</v-icon>
                                <div class="metric-content">
                                    <span class="metric-label">{{ t('pages.nodes.agent') }}</span>
                                    <span class="metric-value">{{ getAgentVersion(r.metric.version) }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Description Section -->
                <div v-if="r.description" class="description-section">
                    <v-divider class="description-divider" />
                    <div class="description-content" v-html="md.render(r.description)"></div>
                </div>
                </div>
            </div>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-state">
            <v-empty-state
                :title="searchKeywords ? t('pages.nodes.noRoutersMatch') : t('pages.nodes.noRoutersAvailable')"
                icon="mdi-server-off-outline" />
        </div>

        <v-dialog v-model="showErrorDialog" max-width="400">
            <v-card rounded="xl" class="pa-2">
                <v-card-title class="text-h6">{{ errorDialogTitle }}</v-card-title>
                <v-card-text>{{ errorDialogContent }}</v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn color="primary" rounded="xl" @click="showErrorDialog = false">OK</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<style scoped>
.nodes-page {
    margin: 0 auto;
    padding: 24px;
    max-width: 1200px;
}
.page-header {
    text-align: center;
    margin: 16px auto 32px;
}

.stat-card {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.stat-card:hover {
    transform: translateY(-2px);
}
.search-input {
    max-width: 500px;
    width: 100%;
}
.search-input :deep(.v-field) {
    box-shadow: none !important;
}
.layout-toggle {
    display: flex;
    gap: 8px;
}
.skeleton-card {
    pointer-events: none;
    cursor: default;
}
.skeleton-card:hover {
    transform: none;
}
.routers-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
    gap: 20px;
    margin-bottom: 40px;
    align-items: start;
}

.router-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 40px;
}

.router-row {
    display: grid;
    grid-template-columns: minmax(220px, 2fr) minmax(150px, 1fr) minmax(220px, 1.5fr) auto;
    gap: 16px;
    align-items: center;
    border-radius: 16px;
    padding: 16px 20px;
    cursor: pointer;
    transition: all 0.2s ease;
    background: rgb(var(--v-theme-surface));
    border: 1px solid rgba(var(--v-border-color), 0.12);
}
.router-row:hover {
    border-color: rgb(var(--v-theme-primary));
    transform: translateY(-2px);
}
.dark .router-row:hover {
    border-color: #40a9ff;
}

.router-row-left {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
}

.router-row-avatar {
    flex-shrink: 0;
}

.router-row-details {
    min-width: 0;
}

.router-row-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #666;
}



.router-row-dot {
    opacity: 0.5;
}

.status-chip {
    font-weight: 600;
}

.status-chip.success {
    color: #52c41a;
}

.status-chip.warning {
    color: #faad14;
}

.status-chip.processing {
    color: #1890ff;
}

.status-chip.default {
    color: #666;
}



.router-row-capacity {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-weight: 500;
    color: #1a1a1a;
}

.dark .router-row-capacity {
    color: #ffffff;
}

.row-capacity-icon {
    color: #1890ff;
    font-size: 16px;
}

.router-row-links {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.router-row-extra {
    font-size: 12px;
    font-weight: 600;
    color: #666;
}

.dark .router-row-extra {
    color: #aaa;
}

.router-row-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

/* Router Card */
.router-card {
    background: rgb(var(--v-theme-surface));
    border: 1px solid rgba(var(--v-border-color), 0.12);
    border-radius: 16px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
}
.router-card:hover {
    border-color: rgb(var(--v-theme-primary));
    transform: translateY(-2px);
}

/* Card Header */
.card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
}

.router-info {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    flex: 1;
}

.router-avatar {
    flex-shrink: 0;
}

.router-title {
    flex: 1;
    min-width: 0;
}

.router-name {
    margin: 0 0 8px 0;
    font-size: 18px;
    font-weight: 600;
    color: rgb(var(--v-theme-on-surface));
    line-height: 1.4;
    word-break: break-word;
}

.status-indicator {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    font-weight: 500;
    padding: 2px 0;
    opacity: 0.8;
}

.status-indicator.success {
    color: #52c41a;
}

.status-indicator.warning {
    color: #faad14;
}

.status-indicator.processing {
    color: #1890ff;
}

.status-indicator.default {
    color: #666;
}

.dark .status-indicator.default {
    color: #aaa;
}

.status-text {
    font-size: 12px;
}

.status-icon {
    font-size: 12px;
}

.card-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
}

/* Capacity Section */
.capacity-section {
    padding: 5px 12px 12px 12px;
    border-radius: 8px;
}

.capacity-info {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
}

.capacity-icon {
    color: #1890ff;
    font-size: 16px;
}

.capacity-text {
    font-weight: 500;
    color: #1a1a1a;
    font-size: 14px;
}

.dark .capacity-text {
    color: #ffffff;
}

/* Connection Section */
.connection-section {
    margin-bottom: 20px;
}

.connection-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.connection-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0px 12px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 500;
    transition: all 0.2s ease;
    border: 1px solid;
    min-height: 32px;
}

.connection-badge-icon {
    font-size: 14px;
    flex-shrink: 0;
}

.connection-badge-text {
    white-space: nowrap;
}

/* Connection badge color variants - using CSS variables for automatic dark mode support */
.connection-badge.wireguard {
    border-color: #52c41a;
    color: #52c41a;
}

.connection-badge.openvpn {
    border-color: #1890ff;
    color: #1890ff;
}

.connection-badge.ipsec {
    border-color: #ff4d4f;
    color: #ff4d4f;
}

.connection-badge.gre {
    border-color: #faad14;
    color: #faad14;
}

.connection-badge.direct {
    border-color: #722ed1;
    color: #722ed1;
}

.connection-badge.default {
    border-color: #f0f0f0;
    color: #666;
}

.dark .connection-badge.default {
    border-color: #2a2a2a;
    color: #aaa;
}

.connection-badge:hover {
    transform: translateY(-1px);
    filter: brightness(1.05);
}

/* Metrics Section */
.metrics-section {
    margin-bottom: 16px;
}

.metrics-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    margin: 8px 0;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    user-select: none;
}

.dark .metrics-toggle {
    background: rgba(64, 169, 255, 0.08);
    border-color: rgba(64, 169, 255, 0.2);
}

.metrics-toggle:hover {
    background: rgba(24, 144, 255, 0.08);
    border-color: rgba(24, 144, 255, 0.25);
}

.dark .metrics-toggle:hover {
    background: rgba(64, 169, 255, 0.12);
    border-color: rgba(64, 169, 255, 0.3);
}

.metrics-toggle-text {
    font-size: 12px;
    font-weight: 500;
    color: #666;
}

.dark .metrics-toggle-text {
    color: #aaa;
}

.metrics-toggle-icon {
    font-size: 12px;
    color: #666;
    transition: transform 0.2s ease;
}

.dark .metrics-toggle-icon {
    color: #aaa;
}

.metrics-toggle-icon.expanded {
    transform: rotate(180deg);
}

.metrics-content {
    animation: slideDown 0.2s ease-out;
    overflow: hidden;
}

@keyframes slideDown {
    from {
        opacity: 0;
        max-height: 0;
        transform: translateY(-10px);
    }

    to {
        opacity: 1;
        max-height: 500px;
        transform: translateY(0);
    }
}

.metrics-title {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
    font-weight: 600;
    color: #1a1a1a;
    font-size: 14px;
}

.dark .metrics-title {
    color: #ffffff;
}

.metrics-title-icon {
    color: #1890ff;
    font-size: 16px;
}

.metrics-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-bottom: 8px;
}

.metric-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 8px;
    min-height: 32px;
}

.metric-icon {
    color: #1890ff;
    font-size: 12px;
    flex-shrink: 0;
}

.metric-content {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
    flex: 1;
}

.metric-label {
    font-size: 10px;
    color: #666;
    font-weight: 500;
    text-transform: uppercase;
    line-height: 1;
}

.dark .metric-label {
    color: #aaa;
}

.metric-value {
    font-size: 12px;
    font-weight: 500;
    color: #1a1a1a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.2;
}

.dark .metric-value {
    color: #ffffff;
}

/* Description Section */
.description-section {
    margin-top: 16px;
}

.description-divider {
    margin: 16px 0 12px 0;
}

.description-content {
    font-size: 14px;
    line-height: 1.6;
    color: #555;
    padding: 12px;
    border-radius: 8px;
}

.dark .description-content {
    color: #aaa;
}

.description-content:deep(p) {
    margin: 0 0 8px 0;
}

.description-content:deep(p:last-child) {
    margin-bottom: 0;
}

.description-content:deep(code) {
    font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
    background-color: #f7fafc;
    color: #e53e3e;
    padding: 0.2rem 0.4rem;
    font-size: 0.85em;
    border-radius: 4px;
    border: 1px solid #e2e8f0;
    font-weight: 500;
    word-break: break-word;
}

.dark .description-content:deep(code) {
    background-color: #2d3748;
    color: #f56565;
    border-color: #4a5568;
}

/* Empty State */
.empty-state {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 200px;
    margin: 60px 0;
}

/* Responsive Design */
@media (max-width: 1200px) {
    .routers-grid {
        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        gap: 20px;
    }

    .router-row {
        grid-template-columns: minmax(200px, 1fr) minmax(140px, 0.8fr) minmax(200px, 1fr) auto;
    }
}

@media (max-width: 768px) {
    .nodes-page {
        padding: 12px 16px;
    }

    .page-title {
        font-size: 28px;
    }

    .stats-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
    }

    .region-filter-section {
        margin-bottom: 24px;
    }

    .region-filters {
        gap: 6px;
        padding: 0 8px;
    }

    .region-filter-btn {
        font-size: 11px;
        height: 28px;
        padding: 0 8px;
    }

    .routers-grid {
        grid-template-columns: 1fr;
        gap: 16px;
    }

    .router-list {
        gap: 10px;
    }

    .router-row {
        grid-template-columns: 1fr;
        padding: 14px;
    }

    .router-row-actions {
        justify-content: flex-start;
    }

    .router-card {
        padding: 16px;
    }

    .card-header {
        flex-direction: column;
        gap: 12px;
    }

    .card-actions {
        align-self: flex-end;
    }

    .connection-badges {
        justify-content: center;
    }
}

@media (max-width: 480px) {
    .nodes-page {
        padding: 8px 12px;
    }

    .stats-grid {
        grid-template-columns: 1fr;
        gap: 10px;
    }

    .region-filters {
        gap: 4px;
        padding: 0 4px;
    }

    .region-filter-btn {
        font-size: 10px;
        height: 24px;
        padding: 0 6px;
        border-radius: 12px;
    }

    .router-info {
        flex-direction: column;
        gap: 8px;
    }

    .router-title {
        text-align: center;
    }

    .metrics-grid {
        grid-template-columns: 1fr;
    }

    .routers-grid {
        grid-template-columns: 1fr;
        gap: 12px;
    }

    .router-row {
        padding: 12px;
    }

    .router-card {
        padding: 14px;
    }

    .connection-badges {
        flex-direction: column;
        align-items: stretch;
    }

    .connection-badge {
        justify-content: center;
    }
}
</style>
