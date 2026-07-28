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

const policyLabels = computed(() => ({
    [RoutingPolicy.FULL]: t('pages.peering.routingPolicyTypes.FULL'),
    [RoutingPolicy.TRANSIT]: t('pages.peering.routingPolicyTypes.TRANSIT'),
    [RoutingPolicy.PEER]: t('pages.peering.routingPolicyTypes.PEER'),
    [RoutingPolicy.DOWNSTREAM]: t('pages.peering.routingPolicyTypes.DOWNSTREAM'),
    [RoutingPolicy.UPSTREAM]: t('pages.peering.routingPolicyTypes.UPSTREAM'),
}))

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
// Delete
// ============================================================
const deleteLoading = ref(false)
const confirmDeleteVisible = ref(false)

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

// ============================================================
// Edit
// ============================================================
const editModalVisible = ref(false)
const editModalLoading = ref(false)

const editForm = ref({
    name: '', description: '', location: '',
    public: true, openPeering: true, autoPeering: true,
    sessionCapacity: 30, callbackUrl: '', agentSecret: '',
    ipv4: '', ipv6: '', ipv6LinkLocal: '',
    linkTypes: [] as string[],
    extensions: [] as string[],
    allowedPolicies: [] as RoutingPolicy[],
})

const openEdit = () => {
    if (!node.value) return
    const f = editForm.value
    f.name = node.value.name
    f.description = node.value.description || ''
    f.location = node.value.location || ''
    f.public = node.value.public || false
    f.openPeering = node.value.openPeering
    f.autoPeering = node.value.autoPeering
    f.sessionCapacity = node.value.sessionCapacity
    f.callbackUrl = node.value.callbackUrl || ''
    f.agentSecret = ''
    f.ipv4 = node.value.ipv4 || ''
    f.ipv6 = node.value.ipv6 || ''
    f.ipv6LinkLocal = node.value.ipv6LinkLocal || ''
    f.linkTypes = [...node.value.linkTypes]
    f.extensions = [...node.value.extensions]
    f.allowedPolicies = [...node.value.allowedPolicies]
    editModalVisible.value = true
}

const saveEdit = async () => {
    if (!node.value) return
    const f = editForm.value
    if (nullOrEmpty(f.name) || nullOrEmpty(f.sessionCapacity) ||
        isNaN(Number(f.sessionCapacity)) || Number(f.sessionCapacity) < 0 ||
        nullOrEmpty(f.callbackUrl) ||
        !f.linkTypes.length || !f.allowedPolicies.length) {
        showSnackbar(t('pages.peering.inputValid'), 'error')
        return
    }
    try {
        editModalLoading.value = true
        const data: any = {
            action: 'setRouter', type: 'update',
            router: node.value.uuid,
            name: f.name, description: f.description || null, location: f.location || null,
            public: !!f.public, openPeering: !!f.openPeering, autoPeering: !!f.autoPeering,
            sessionCapacity: Number(f.sessionCapacity), callbackUrl: f.callbackUrl,
            ipv4: f.ipv4 || null, ipv6: f.ipv6 || null, ipv6LinkLocal: f.ipv6LinkLocal || null,
            linkTypes: f.linkTypes, extensions: f.extensions, allowedPolicies: f.allowedPolicies,
        }
        if (!nullOrEmpty(f.agentSecret)) data.agentSecret = f.agentSecret
        const resp = await makeRequest(t, '/admin', data)
        if (resp.success) {
            editModalVisible.value = false
            await fetchNode()
        }
    } catch (error) {
        console.error(error)
    } finally {
        editModalLoading.value = false
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
            <h2 class="text-h6 mb-2">{{ t('pages.manage.nodes.nodeNotFound') }}</h2>
            <v-btn color="primary" rounded="pill" @click="router.push('/admin/nodes')">{{ t('pages.manage.nodes.backToNodes') }}</v-btn>
        </div>

        <template v-else>
            <!-- Header -->
            <div class="page-header">
                <div class="d-flex align-center ga-2 mb-1" style="max-width: 1200px; margin: 0 auto">
                    <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="router.push('/admin/nodes')" class="back-btn">
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
                        <span class="text-body-1 font-weight-medium">{{ t('pages.manage.nodes.basicConfiguration') }}</span>
                        <v-spacer />
                        <v-btn size="small" variant="tonal" rounded="pill" prepend-icon="mdi-pencil" @click="openEdit">
                            {{ t('pages.manage.posts.edit') }}
                        </v-btn>
                    </v-card-title>
                    <v-card-text class="pa-4">
                        <v-row>
                            <v-col cols="12">
                                <div class="text-caption text-medium-emphasis">UUID</div>
                                <div class="text-body-2 mt-1 font-mono">{{ node.uuid }}</div>
                            </v-col>
                            <v-col cols="12" sm="6" md="3">
                                <div class="text-caption text-medium-emphasis">{{ t('pages.manage.nodes.location') }}</div>
                                <div class="text-body-2 mt-1 font-weight-medium">{{ node.location || '—' }}</div>
                            </v-col>
                            <v-col cols="12" sm="6" md="3">
                                <div class="text-caption text-medium-emphasis">{{ t('pages.manage.nodes.publicLabel') }}</div>
                                <v-chip :color="node.public ? 'success' : 'default'" size="x-small" variant="tonal" class="mt-1">
                                    {{ node.public ? 'Yes' : 'No' }}
                                </v-chip>
                            </v-col>
                            <v-col cols="12" sm="6" md="3">
                                <div class="text-caption text-medium-emphasis">{{ t('pages.manage.nodes.openPeeringLabel') }}</div>
                                <v-chip :color="node.openPeering ? 'success' : 'default'" size="x-small" variant="tonal" class="mt-1">
                                    {{ node.openPeering ? 'Yes' : 'No' }}
                                </v-chip>
                            </v-col>
                            <v-col cols="12" sm="6" md="3">
                                <div class="text-caption text-medium-emphasis">{{ t('pages.manage.nodes.autoPeeringLabel') }}</div>
                                <v-chip :color="node.autoPeering ? 'success' : 'default'" size="x-small" variant="tonal" class="mt-1">
                                    {{ node.autoPeering ? 'Yes' : 'No' }}
                                </v-chip>
                            </v-col>
                            <v-col cols="12" sm="6" md="4">
                                <div class="text-caption text-medium-emphasis">{{ t('pages.metrics.interfaceIPv4') }}</div>
                                <div class="text-body-2 mt-1 font-mono">{{ node.ipv4 || '—' }}</div>
                            </v-col>
                            <v-col cols="12" sm="6" md="4">
                                <div class="text-caption text-medium-emphasis">{{ t('pages.metrics.interfaceIPv6') }}</div>
                                <div class="text-body-2 mt-1 font-mono">{{ node.ipv6 || '—' }}</div>
                            </v-col>
                            <v-col cols="12" sm="6" md="4">
                                <div class="text-caption text-medium-emphasis">{{ t('pages.metrics.interfaceIPv6LinkLocal') }}</div>
                                <div class="text-body-2 mt-1 font-mono">{{ node.ipv6LinkLocal || '—' }}</div>
                            </v-col>
                        </v-row>
                    </v-card-text>
                </v-card>

                <!-- 2. Peering Capabilities -->
                <v-card rounded="xl" elevation="0" border class="mb-6">
                    <v-card-title class="d-flex align-center ga-2 pa-4 pb-0">
                        <v-icon color="primary">mdi-link-variant</v-icon>
                        <span class="text-body-1 font-weight-medium">{{ t('pages.manage.nodes.peeringCapabilities') }}</span>
                    </v-card-title>
                    <v-card-text class="pa-4">
                        <v-row>
                            <v-col cols="12" sm="6">
                                <div class="text-caption text-medium-emphasis mb-2">{{ t('pages.manage.nodes.sessionCapacityLabel') }}</div>
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
                                <div class="text-caption text-medium-emphasis mb-2">{{ t('pages.manage.nodes.callbackUrlLabel') }}</div>
                                <div class="text-body-2 font-mono text-truncate" style="max-width: 400px">{{ node.callbackUrl || '—' }}</div>
                            </v-col>
                            <v-col cols="12">
                                <div class="text-caption text-medium-emphasis mb-2">{{ t('pages.manage.nodes.linkTypesLabel') }}</div>
                                <div class="d-flex flex-wrap ga-1">
                                    <v-chip v-for="lt in node.linkTypes" :key="lt" size="small" variant="outlined" color="primary">
                                        {{ linkTypeLabels[lt] || lt }}
                                    </v-chip>
                                    <span v-if="!node.linkTypes.length" class="text-medium-emphasis">—</span>
                                </div>
                            </v-col>
                            <v-col cols="12">
                                <div class="text-caption text-medium-emphasis mb-2">{{ t('pages.manage.nodes.bgpExtensions') }}</div>
                                <div class="d-flex flex-wrap ga-1">
                                    <v-chip v-for="ext in node.extensions" :key="ext" size="small" variant="outlined" color="secondary">
                                        {{ ext }}
                                    </v-chip>
                                    <span v-if="!node.extensions.length" class="text-medium-emphasis">—</span>
                                </div>
                            </v-col>
                            <v-col cols="12">
                                <div class="text-caption text-medium-emphasis mb-2">{{ t('pages.manage.nodes.allowedPoliciesLabel') }}</div>
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
                        <span class="text-body-1 font-weight-medium">{{ t('pages.manage.nodes.agentStatusLabel') }}</span>
                    </v-card-title>
                    <v-card-text class="pa-4">
                        <template v-if="metric">
                            <v-row>
                                <v-col cols="12" sm="6" md="3">
                                    <div class="text-caption text-medium-emphasis">{{ t('pages.manage.nodes.statusLabel') }}</div>
                                    <v-chip :color="isAgentOnline ? 'success' : 'error'" size="small" variant="tonal" class="mt-1 font-weight-medium">
                                        {{ isAgentOnline ? 'Online' : 'Offline' }}
                                    </v-chip>
                                </v-col>
                                <v-col cols="12" sm="6" md="3">
                                    <div class="text-caption text-medium-emphasis">{{ t('pages.manage.nodes.uptime') }}</div>
                                    <div class="text-body-2 mt-1 font-weight-medium">{{ formatUptime(metric.uptime) }}</div>
                                </v-col>
                                <v-col cols="12" sm="6" md="3">
                                    <div class="text-caption text-medium-emphasis">{{ t('pages.manage.nodes.loadAverage') }}</div>
                                    <div class="text-body-2 mt-1 font-mono">{{ metric.loadAvg || '—' }}</div>
                                </v-col>
                                <v-col cols="12" sm="6" md="3">
                                    <div class="text-caption text-medium-emphasis">{{ t('pages.manage.nodes.bandwidth') }}</div>
                                    <div class="text-body-2 mt-1">
                                        ↑ {{ formatBytes(metric.tx || 0) }} / ↓ {{ formatBytes(metric.rx || 0) }}
                                    </div>
                                </v-col>
                                <v-col cols="12" sm="6">
                                    <div class="text-caption text-medium-emphasis">{{ t('pages.manage.nodes.agentVersion') }}</div>
                                    <div class="text-body-2 mt-1 font-mono">{{ metric.version || '—' }}</div>
                                </v-col>
                                <v-col cols="12" sm="6">
                                    <div class="text-caption text-medium-emphasis">{{ t('pages.manage.nodes.kernel') }}</div>
                                    <div class="text-body-2 mt-1 font-mono">{{ metric.kernel || '—' }}</div>
                                </v-col>
                            </v-row>
                        </template>
                        <div v-else class="text-center pa-6 text-medium-emphasis">
                            <v-icon size="40" class="mb-2">mdi-server-network-off</v-icon>
                            <p class="text-body-2">{{ t('pages.manage.nodes.agentNotReporting') }}</p>
                        </div>
                    </v-card-text>
                </v-card>

                <!-- 4. Diagnostics (placeholder) -->
                <v-card rounded="xl" elevation="0" border class="mb-6">
                    <v-card-title class="d-flex align-center ga-2 pa-4 pb-0">
                        <v-icon color="primary">mdi-stethoscope</v-icon>
                        <span class="text-body-1 font-weight-medium">{{ t('pages.manage.nodes.diagnostics') }}</span>
                    </v-card-title>
                    <v-card-text class="pa-4">
                        <div class="text-center pa-6 text-medium-emphasis">
                            <v-icon size="40" class="mb-2">mdi-tools</v-icon>
                            <p class="text-body-2">{{ t('pages.manage.nodes.diagnosticsComingSoon') }}</p>
                        </div>
                    </v-card-text>
                </v-card>

                <!-- 5. Danger Zone -->
                <v-card rounded="xl" elevation="0" border class="mb-6 danger-zone-card">
                    <v-card-title class="d-flex align-center ga-2 pa-4 pb-0">
                        <v-icon color="error">mdi-alert-outline</v-icon>
                        <span class="text-body-1 font-weight-medium text-error">{{ t('pages.manage.nodes.dangerZone') }}</span>
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
                                {{ t('pages.manage.nodes.deleteNode') }}
                            </v-btn>
                        </div>
                    </v-card-text>
                </v-card>
            </v-container>
        </template>

        <!-- Confirm Delete Dialog -->
        <v-dialog v-model="confirmDeleteVisible" max-width="400">
            <v-card rounded="xl" class="pa-4">
                <v-card-title class="text-body-1 font-weight-medium">{{ t('pages.manage.nodes.deleteNodeConfirm') }}</v-card-title>
                <v-card-text class="text-body-2 text-medium-emphasis">
                    {{ t('pages.manage.nodes.deleteNodeDesc') }} <strong>{{ node?.name }}</strong> {{ t('pages.manage.nodes.deleteNodeWarning') }}
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn @click="confirmDeleteVisible = false" rounded="xl" variant="text">{{ t('pages.manage.posts.close') }}</v-btn>
                    <v-btn color="error" @click="doDelete()" :loading="deleteLoading" rounded="xl" variant="flat">{{ t('pages.manage.nodes.deleteNode') }}</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- Edit Dialog -->
        <v-dialog v-model="editModalVisible" max-width="800" scrollable>
            <v-card rounded="xl">
                <v-card-title class="text-h6 pa-6 pb-2">{{ t('pages.manage.posts.edit') }}</v-card-title>
                <v-progress-linear v-if="editModalLoading" indeterminate color="primary" />
                <v-card-text class="pa-6 pt-2">
                    <v-form>
                        <v-text-field variant="outlined" rounded="lg" density="comfortable" v-model="editForm.name" :label="t('pages.manage.nodes.name')" />
                        <v-textarea variant="outlined" rounded="lg" density="comfortable" :rows="2" v-model="editForm.description" :label="t('pages.manage.nodes.description')" />
                        <v-text-field variant="outlined" rounded="lg" density="comfortable" v-model="editForm.location" :label="t('pages.manage.nodes.location')" />
                        <v-switch v-model="editForm.public" :label="t('pages.manage.nodes.publicLabel')" color="primary" hide-details />
                        <v-switch v-model="editForm.openPeering" :label="t('pages.manage.nodes.openPeeringLabel')" color="primary" hide-details />
                        <v-switch v-model="editForm.autoPeering" :label="t('pages.manage.nodes.autoPeeringLabel')" color="primary" hide-details />
                        <v-text-field variant="outlined" rounded="lg" density="comfortable" v-model="editForm.sessionCapacity" type="number" :label="t('pages.manage.nodes.sessionCapacityLabel')" />
                        <v-text-field variant="outlined" rounded="lg" density="comfortable" v-model="editForm.callbackUrl" :label="t('pages.manage.nodes.callbackUrlLabel')" />
                        <v-text-field variant="outlined" rounded="lg" density="comfortable" v-model="editForm.agentSecret" :label="t('pages.manage.nodes.agentSecret')" :placeholder="t('pages.manage.nodes.resetSecretHint')" :hint="t('pages.manage.nodes.resetSecretHint')" persistent-hint />
                        <v-text-field variant="outlined" rounded="lg" density="comfortable" v-model="editForm.ipv4" :label="t('pages.metrics.interfaceIPv4')" />
                        <v-text-field variant="outlined" rounded="lg" density="comfortable" v-model="editForm.ipv6" :label="t('pages.metrics.interfaceIPv6')" />
                        <v-text-field variant="outlined" rounded="lg" density="comfortable" v-model="editForm.ipv6LinkLocal" :label="t('pages.metrics.interfaceIPv6LinkLocal')" />
                        <div class="mb-2 font-weight-medium">{{ t('pages.manage.nodes.linkTypesLabel') }}</div>
                        <div class="d-flex flex-wrap ga-2">
                            <v-checkbox v-model="editForm.linkTypes" value="wireguard" :label="t('pages.peering[\'wireguard\']')" density="compact" hide-details />
                            <v-checkbox v-model="editForm.linkTypes" value="openvpn" :label="t('pages.peering[\'openvpn\']')" density="compact" hide-details />
                            <v-checkbox v-model="editForm.linkTypes" value="ipsec" :label="t('pages.peering[\'ipsec\']')" density="compact" hide-details />
                            <v-checkbox v-model="editForm.linkTypes" value="gre" :label="t('pages.peering[\'gre\']')" density="compact" hide-details />
                            <v-checkbox v-model="editForm.linkTypes" value="ip6gre" :label="t('pages.peering[\'ip6gre\']')" density="compact" hide-details />
                            <v-checkbox v-model="editForm.linkTypes" value="direct" :label="t('pages.peering[\'direct\']')" density="compact" hide-details />
                        </div>
                        <div class="mb-2 mt-4 font-weight-medium">{{ t('pages.peering.bgpExtensions') }}</div>
                        <div class="d-flex flex-wrap ga-2">
                            <v-checkbox v-model="editForm.extensions" value="mp-bgp" :label="t('pages.peering[\'mp-bgp\']')" density="compact" hide-details />
                            <v-checkbox v-model="editForm.extensions" value="extended-nexthop" :label="t('pages.peering[\'extended-nexthop\']')" density="compact" hide-details />
                        </div>
                        <div class="mb-2 mt-4 font-weight-medium">{{ t('pages.manage.nodes.allowedPoliciesLabel') }}</div>
                        <div class="d-flex flex-wrap ga-2">
                            <v-checkbox v-model="editForm.allowedPolicies" :value="RoutingPolicy.FULL" :label="t('pages.peering.routingPolicyTypes.FULL')" density="compact" hide-details />
                            <v-checkbox v-model="editForm.allowedPolicies" :value="RoutingPolicy.TRANSIT" :label="t('pages.peering.routingPolicyTypes.TRANSIT')" density="compact" hide-details />
                            <v-checkbox v-model="editForm.allowedPolicies" :value="RoutingPolicy.PEER" :label="t('pages.peering.routingPolicyTypes.PEER')" density="compact" hide-details />
                            <v-checkbox v-model="editForm.allowedPolicies" :value="RoutingPolicy.DOWNSTREAM" :label="t('pages.peering.routingPolicyTypes.DOWNSTREAM')" density="compact" hide-details />
                            <v-checkbox v-model="editForm.allowedPolicies" :value="RoutingPolicy.UPSTREAM" :label="t('pages.peering.routingPolicyTypes.UPSTREAM')" density="compact" hide-details />
                        </div>
                    </v-form>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn @click="editModalVisible = false" rounded="xl" variant="text">{{ t('pages.manage.posts.close') }}</v-btn>
                    <v-btn color="primary" @click="saveEdit()" :loading="editModalLoading" rounded="xl" variant="flat">{{ t('pages.manage.config.save') }}</v-btn>
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
