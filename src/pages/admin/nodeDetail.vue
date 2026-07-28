<!--
*******************************************************************
pages/admin/nodeDetail.vue — Admin Node Detail Page

Copyright (C) 2026 Luochancy

Licensed under the GNU General Public License v3.0.
See the LICENSE file in the project root for details.
*******************************************************************
-->
<script setup lang="ts">
import { onMounted, Ref, ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
    loggedIn, isAdmin, nullOrEmpty, registerPageTitle, showSnackbar, formatBytes
} from '../../common/helper'
import {
    makeRequest, RouterMetadata, RoutersResponse, SessionMetadata, SessionsResponse, RoutingPolicy
} from '../../common/packetHandler'
import RouterLocationAvatar from '../../components/RouterLocationAvatar.vue'

const t = useI18n().t
const router = useRouter()
const route = useRoute()

const nodeUuid = route.params.uuid as string

// ============================================================
// State
// ============================================================
const loading = ref(true)
const node: Ref<RouterMetadata | null> = ref(null)
const sessions: Ref<SessionMetadata[]> = ref([])

// ============================================================
// Auth guard
// ============================================================
onMounted(async () => {
    if (!loggedIn.value) {
        showSnackbar(t('pages.nodes.pleaseSignIn'), 'info')
        router.replace({ path: '/signin' })
        return
    }
    if (!isAdmin.value) {
        showSnackbar(t('pages.manage.manageSessions'), 'error')
        router.replace({ path: '/manage' })
        return
    }
    registerPageTitle(`Node Detail`)
    await fetchNode()
})

// ============================================================
// Fetch
// ============================================================
const fetchNode = async () => {
    try {
        loading.value = true
        const resp = await makeRequest(t, '/admin', { action: 'enumRouters' })
        if (resp.success && resp.response) {
            const data = resp.response as RoutersResponse
            if (data && Array.isArray(data.routers)) {
                node.value = data.routers.find(r => r.uuid === nodeUuid) || null
            }
        }
    } catch (error) {
        console.error(error)
    } finally {
        loading.value = false
    }
}

// ============================================================
// Helpers
// ============================================================
const isAgentOnline = computed(() => {
    if (!node.value) return false
    return !!node.value.metric && typeof (node.value.metric as any).uptime === 'number' && (node.value.metric as any).uptime > 0
})

const formatUptime = (seconds: number) => {
    if (!seconds || seconds <= 0) return '—'
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (days > 0) return `${days}d ${hours}h ${mins}m`
    if (hours > 0) return `${hours}h ${mins}m`
    return `${mins}m`
}

const linkTypeLabels: Record<string, string> = {
    wireguard: 'WG', openvpn: 'OVPN', ipsec: 'IPSec',
    gre: 'GRE', ip6gre: 'GRE6', direct: 'Direct',
}

const policyLabels: Record<number, string> = {
    [RoutingPolicy.FULL]: 'Full',
    [RoutingPolicy.TRANSIT]: 'Transit',
    [RoutingPolicy.PEER]: 'Peer',
    [RoutingPolicy.DOWNSTREAM]: 'Downstream',
    [RoutingPolicy.UPSTREAM]: 'Upstream',
}

const metric = computed(() => {
    if (!node.value?.metric) return null
    return node.value.metric as any
})

const sessionCount = computed(() => node.value?.sessionCount || 0)
const sessionCapacity = computed(() => node.value?.sessionCapacity || 0)
const capacityRatio = computed(() => {
    if (sessionCapacity.value <= 0) return 0
    return sessionCount.value / sessionCapacity.value
})

// ============================================================
// Quick actions
// ============================================================
const syncLoading = ref(false)
const deleteLoading = ref(false)
const confirmDeleteVisible = ref(false)

const forceSync = async () => {
    if (!node.value) return
    try {
        syncLoading.value = true
        const resp = await makeRequest(t, '/admin', { action: 'sync', router: node.value.uuid })
        if (resp.success) {
            showSnackbar('Sync initiated', 'success')
        }
    } catch (error) {
        console.error(error)
    } finally {
        syncLoading.value = false
    }
}

const doDelete = async () => {
    if (!node.value) return
    try {
        deleteLoading.value = true
        const resp = await makeRequest(t, '/admin', { action: 'deleteRouter', router: node.value.uuid })
        if (resp.success) {
            showSnackbar(t('pages.manage.session.remove'), 'success')
            confirmDeleteVisible.value = false
            router.push('/admin/nodes')
        }
    } catch (error) {
        console.error(error)
    } finally {
        deleteLoading.value = false
    }
}
</script>

<template>
    <div class="admin-node-detail-page">
        <!-- Loading -->
        <div v-if="loading" class="d-flex justify-center align-center pa-12">
            <v-progress-circular indeterminate color="primary" size="40" />
        </div>

        <!-- Not found -->
        <div v-else-if="!node" class="text-center pa-12 text-medium-emphasis">
            <v-icon size="64" color="warning" class="mb-4">mdi-alert-circle-outline</v-icon>
            <h2 class="text-h6 mb-2">Node not found</h2>
            <v-btn color="primary" rounded="pill" @click="router.push('/admin/nodes')">Back to Nodes</v-btn>
        </div>

        <template v-else>
            <!-- Header -->
            <div class="page-header">
                <div class="d-flex align-center justify-center ga-3 mb-2">
                    <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="router.push('/admin/nodes')" rounded="pill">
                        {{ t('pages.metrics.back') }}
                    </v-btn>
                </div>
                <div class="d-flex align-center justify-center ga-3 mb-1">
                    <router-location-avatar :router="node" :hide-peering-dot="true" size="large" />
                    <h1 class="text-h4 font-weight-bold">{{ node.name }}</h1>
                    <v-chip
                        :color="isAgentOnline ? 'success' : 'error'"
                        size="small"
                        variant="tonal"
                        class="font-weight-medium"
                    >
                        <span class="agent-dot" :class="isAgentOnline ? 'agent-dot--online' : 'agent-dot--offline'" />
                        {{ isAgentOnline ? 'Online' : 'Offline' }}
                    </v-chip>
                </div>
                <p v-if="node.description" class="text-body-1 text-medium-emphasis">{{ node.description }}</p>
            </div>

            <v-container style="max-width: 1000px">
                <!-- 1. Basic Configuration -->
                <v-card rounded="xl" elevation="0" border class="mb-6">
                    <v-card-title class="d-flex align-center ga-2 pa-4 pb-0">
                        <v-icon color="primary">mdi-cog-outline</v-icon>
                        <span class="text-body-1 font-weight-medium">Basic Configuration</span>
                        <v-spacer />
                        <v-btn size="small" variant="tonal" rounded="pill" prepend-icon="mdi-pencil" @click="router.push('/admin/nodes')">
                            {{ t('pages.manage.posts.edit') }}
                        </v-btn>
                    </v-card-title>
                    <v-card-text class="pa-4">
                        <v-row>
                            <v-col cols="12" sm="6" md="3">
                                <div class="text-caption text-medium-emphasis">Location</div>
                                <div class="text-body-2 mt-1 font-weight-medium">{{ node.location || '—' }}</div>
                            </v-col>
                            <v-col cols="12" sm="6" md="3">
                                <div class="text-caption text-medium-emphasis">Public</div>
                                <v-chip :color="node.public ? 'success' : 'default'" size="x-small" variant="tonal" class="mt-1">
                                    {{ node.public ? 'Yes' : 'No' }}
                                </v-chip>
                            </v-col>
                            <v-col cols="12" sm="6" md="3">
                                <div class="text-caption text-medium-emphasis">Open Peering</div>
                                <v-chip :color="node.openPeering ? 'success' : 'default'" size="x-small" variant="tonal" class="mt-1">
                                    {{ node.openPeering ? 'Yes' : 'No' }}
                                </v-chip>
                            </v-col>
                            <v-col cols="12" sm="6" md="3">
                                <div class="text-caption text-medium-emphasis">Auto Peering</div>
                                <v-chip :color="node.autoPeering ? 'success' : 'default'" size="x-small" variant="tonal" class="mt-1">
                                    {{ node.autoPeering ? 'Yes' : 'No' }}
                                </v-chip>
                            </v-col>
                            <v-col cols="12" sm="6" md="4">
                                <div class="text-caption text-medium-emphasis">IPv4</div>
                                <div class="text-body-2 mt-1 font-mono">{{ node.ipv4 || '—' }}</div>
                            </v-col>
                            <v-col cols="12" sm="6" md="4">
                                <div class="text-caption text-medium-emphasis">IPv6</div>
                                <div class="text-body-2 mt-1 font-mono">{{ node.ipv6 || '—' }}</div>
                            </v-col>
                            <v-col cols="12" sm="6" md="4">
                                <div class="text-caption text-medium-emphasis">IPv6 Link-local</div>
                                <div class="text-body-2 mt-1 font-mono">{{ node.ipv6LinkLocal || '—' }}</div>
                            </v-col>
                        </v-row>
                    </v-card-text>
                </v-card>

                <!-- 2. Peering Capabilities -->
                <v-card rounded="xl" elevation="0" border class="mb-6">
                    <v-card-title class="d-flex align-center ga-2 pa-4 pb-0">
                        <v-icon color="primary">mdi-link-variant</v-icon>
                        <span class="text-body-1 font-weight-medium">Peering Capabilities</span>
                    </v-card-title>
                    <v-card-text class="pa-4">
                        <v-row>
                            <v-col cols="12" sm="6">
                                <div class="text-caption text-medium-emphasis mb-2">Session Capacity</div>
                                <div class="d-flex align-center ga-2">
                                    <v-progress-linear
                                        :model-value="capacityRatio * 100"
                                        :color="capacityRatio >= 1 ? 'error' : capacityRatio >= 0.8 ? 'warning' : 'primary'"
                                        height="8"
                                        rounded
                                        style="max-width: 200px"
                                    />
                                    <span class="text-body-2 font-weight-medium">{{ sessionCount }}/{{ sessionCapacity }}</span>
                                </div>
                            </v-col>
                            <v-col cols="12" sm="6">
                                <div class="text-caption text-medium-emphasis mb-2">Callback URL</div>
                                <div class="text-body-2 font-mono text-truncate" style="max-width: 400px">{{ node.callbackUrl || '—' }}</div>
                            </v-col>
                            <v-col cols="12">
                                <div class="text-caption text-medium-emphasis mb-2">Link Types</div>
                                <div class="d-flex flex-wrap ga-1">
                                    <v-chip v-for="lt in node.linkTypes" :key="lt" size="small" variant="outlined" color="primary">
                                        {{ linkTypeLabels[lt] || lt }}
                                    </v-chip>
                                    <span v-if="!node.linkTypes.length" class="text-medium-emphasis">—</span>
                                </div>
                            </v-col>
                            <v-col cols="12">
                                <div class="text-caption text-medium-emphasis mb-2">BGP Extensions</div>
                                <div class="d-flex flex-wrap ga-1">
                                    <v-chip v-for="ext in node.extensions" :key="ext" size="small" variant="outlined" color="secondary">
                                        {{ ext }}
                                    </v-chip>
                                    <span v-if="!node.extensions.length" class="text-medium-emphasis">—</span>
                                </div>
                            </v-col>
                            <v-col cols="12">
                                <div class="text-caption text-medium-emphasis mb-2">Allowed Policies</div>
                                <div class="d-flex flex-wrap ga-1">
                                    <v-chip v-for="p in node.allowedPolicies" :key="p" size="small" variant="tonal" color="info">
                                        {{ policyLabels[p] || p }}
                                    </v-chip>
                                </div>
                            </v-col>
                        </v-row>
                    </v-card-text>
                </v-card>

                <!-- 3. Agent Status -->
                <v-card rounded="xl" elevation="0" border class="mb-6">
                    <v-card-title class="d-flex align-center ga-2 pa-4 pb-0">
                        <v-icon :color="isAgentOnline ? 'success' : 'error'">mdi-server-network</v-icon>
                        <span class="text-body-1 font-weight-medium">Agent Status</span>
                        <v-spacer />
                        <v-btn
                            size="small"
                            variant="tonal"
                            rounded="pill"
                            prepend-icon="mdi-sync"
                            :loading="syncLoading"
                            @click="forceSync"
                        >
                            Force Sync
                        </v-btn>
                    </v-card-title>
                    <v-card-text class="pa-4">
                        <template v-if="metric">
                            <v-row>
                                <v-col cols="12" sm="6" md="3">
                                    <div class="text-caption text-medium-emphasis">Status</div>
                                    <v-chip :color="isAgentOnline ? 'success' : 'error'" size="small" variant="tonal" class="mt-1 font-weight-medium">
                                        {{ isAgentOnline ? 'Online' : 'Offline' }}
                                    </v-chip>
                                </v-col>
                                <v-col cols="12" sm="6" md="3">
                                    <div class="text-caption text-medium-emphasis">Uptime</div>
                                    <div class="text-body-2 mt-1 font-weight-medium">{{ formatUptime(metric.uptime) }}</div>
                                </v-col>
                                <v-col cols="12" sm="6" md="3">
                                    <div class="text-caption text-medium-emphasis">Load Average</div>
                                    <div class="text-body-2 mt-1 font-mono">{{ metric.loadAvg || '—' }}</div>
                                </v-col>
                                <v-col cols="12" sm="6" md="3">
                                    <div class="text-caption text-medium-emphasis">Bandwidth</div>
                                    <div class="text-body-2 mt-1">
                                        ↑ {{ formatBytes(metric.tx || 0) }} / ↓ {{ formatBytes(metric.rx || 0) }}
                                    </div>
                                </v-col>
                                <v-col cols="12" sm="6">
                                    <div class="text-caption text-medium-emphasis">Agent Version</div>
                                    <div class="text-body-2 mt-1 font-mono">{{ metric.version || '—' }}</div>
                                </v-col>
                                <v-col cols="12" sm="6">
                                    <div class="text-caption text-medium-emphasis">Kernel</div>
                                    <div class="text-body-2 mt-1 font-mono">{{ metric.kernel || '—' }}</div>
                                </v-col>
                            </v-row>
                        </template>
                        <div v-else class="text-center pa-6 text-medium-emphasis">
                            <v-icon size="40" class="mb-2">mdi-server-network-off</v-icon>
                            <p class="text-body-2">Agent not reporting — no metric data available</p>
                        </div>
                    </v-card-text>
                </v-card>

                <!-- 4. Diagnostics (placeholder) -->
                <v-card rounded="xl" elevation="0" border class="mb-6">
                    <v-card-title class="d-flex align-center ga-2 pa-4 pb-0">
                        <v-icon color="primary">mdi-stethoscope</v-icon>
                        <span class="text-body-1 font-weight-medium">Diagnostics</span>
                    </v-card-title>
                    <v-card-text class="pa-4">
                        <div class="text-center pa-6 text-medium-emphasis">
                            <v-icon size="40" class="mb-2">mdi-tools</v-icon>
                            <p class="text-body-2">LG tools, callback test, and probe diagnostics coming soon</p>
                        </div>
                    </v-card-text>
                </v-card>

                <!-- 5. Danger Zone -->
                <v-card rounded="xl" elevation="0" border class="mb-6" color="error">
                    <v-card-title class="d-flex align-center ga-2 pa-4 pb-0">
                        <v-icon color="error">mdi-alert-outline</v-icon>
                        <span class="text-body-1 font-weight-medium">Danger Zone</span>
                    </v-card-title>
                    <v-card-text class="pa-4">
                        <div class="d-flex flex-wrap ga-2">
                            <v-btn
                                variant="outlined"
                                color="error"
                                rounded="pill"
                                prepend-icon="mdi-delete"
                                :loading="deleteLoading"
                                @click="confirmDeleteVisible = true"
                            >
                                Delete Node
                            </v-btn>
                        </div>
                    </v-card-text>
                </v-card>
            </v-container>
        </template>

        <!-- Confirm Delete Dialog -->
        <v-dialog v-model="confirmDeleteVisible" max-width="400">
            <v-card rounded="xl" class="pa-4">
                <v-card-title class="text-body-1 font-weight-medium">Delete Node?</v-card-title>
                <v-card-text class="text-body-2 text-medium-emphasis">
                    This will permanently delete <strong>{{ node?.name }}</strong> and cannot be undone.
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn @click="confirmDeleteVisible = false" rounded="xl" variant="text">{{ t('pages.manage.posts.close') }}</v-btn>
                    <v-btn color="error" @click="doDelete()" :loading="deleteLoading" rounded="xl" variant="flat">Delete</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<style scoped>
.admin-node-detail-page {
    min-height: 100vh;
}
.page-header {
    text-align: center;
    padding: 1rem 1rem 0.5rem;
}
.agent-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    margin-right: 4px;
}
.agent-dot--online {
    background-color: rgb(var(--v-theme-success));
}
.agent-dot--offline {
    background-color: rgb(var(--v-theme-on-surface-variant));
    opacity: 0.4;
}
.font-mono {
    font-family: 'Roboto Mono', 'SF Mono', 'Fira Code', monospace;
    font-size: 0.9em;
}
</style>
