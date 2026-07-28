<!--
*******************************************************************
pages/admin/nodes.vue — Admin Node Management List

Copyright (C) 2026 Luochancy

Licensed under the GNU General Public License v3.0.
See the LICENSE file in the project root for details.
*******************************************************************
-->
<script setup lang="ts">
import { onMounted, Ref, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { loggedIn, isAdmin, nullOrEmpty, registerPageTitle, showSnackbar, formatBytes } from '../../common/helper'
import { makeRequest, RouterMetadata, RoutersResponse, RoutingPolicy } from '../../common/packetHandler'
import RouterLocationAvatar from '../../components/RouterLocationAvatar.vue'

const t = useI18n().t
const router = useRouter()

// ============================================================
// State
// ============================================================
const loading = ref(false)
const routers: Ref<RouterMetadata[]> = ref([])

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
    registerPageTitle(t('pages.manage.manageNodes'))
    await fetchRouters()
})

// ============================================================
// Fetch
// ============================================================
const fetchRouters = async () => {
    try {
        loading.value = true
        const resp = await makeRequest(t, '/admin', { action: 'enumRouters' })
        if (resp.success && resp.response) {
            const data = resp.response as RoutersResponse
            if (data && Array.isArray(data.routers)) {
                routers.value = data.routers
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
const sessionCapacityColor = (count: number, capacity: number) => {
    if (capacity <= 0) return 'default'
    const ratio = count / capacity
    if (ratio >= 1) return 'error'
    if (ratio >= 0.8) return 'warning'
    return 'default'
}

const isAgentOnline = (item: RouterMetadata) => {
    const m = item.metric as any
    return !!m && typeof m.uptime === 'number' && m.uptime > 0
}

const getAgentUptime = (item: RouterMetadata): string => {
    const m = item.metric as any
    if (!m || typeof m.uptime !== 'number' || m.uptime <= 0) return 'Offline'
    return formatUptime(m.uptime)
}

const formatUptime = (seconds: number | undefined) => {
    if (!seconds || seconds <= 0) return '—'
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${mins}m`
    return `${mins}m`
}

const linkTypeLabels: Record<string, string> = {
    wireguard: 'WG', openvpn: 'OVPN', ipsec: 'IPSec',
    gre: 'GRE', ip6gre: 'GRE6', direct: 'Direct',
}

const getNodeStatus = (item: RouterMetadata): { label: string; color: string } => {
    const online = isAgentOnline(item)
    const full = item.sessionCount >= item.sessionCapacity
    const closed = !item.public || !item.openPeering

    if (!online) return { label: 'Offline', color: 'error' }
    if (closed) return { label: 'Closed', color: 'warning' }
    if (full) return { label: 'Full', color: 'warning' }
    return { label: 'Online', color: 'success' }
}

// ============================================================
// Table headers
// ============================================================
const headers = computed(() => [
    { title: t('pages.manage.nodes.name'), key: 'name', sortable: true },
    { title: '', key: 'status', sortable: false },
    { title: t('pages.manage.nodes.sessionCount'), key: 'sessionCount', sortable: true },
    { title: t('pages.manage.nodes.agentStatus'), key: 'agentStatus', sortable: false },
    { title: t('pages.manage.nodes.linkTypes'), key: 'linkTypes', sortable: false },
    { title: t('pages.manage.session.action'), key: 'action', sortable: false },
])

// ============================================================
// Delete
// ============================================================
const confirmDeleteVisible = ref(false)
const recordToDelete: Ref<RouterMetadata | null> = ref(null)

const confirmRemove = (record: RouterMetadata) => {
    recordToDelete.value = record
    confirmDeleteVisible.value = true
}

const doRemove = async () => {
    if (!recordToDelete.value) return
    try {
        loading.value = true
        const resp = await makeRequest(t, '/admin', {
            action: 'deleteRouter',
            router: recordToDelete.value.uuid
        })
        if (resp.success) {
            showSnackbar(t('pages.manage.session.remove'), 'success')
            confirmDeleteVisible.value = false
            recordToDelete.value = null
            await fetchRouters()
        }
    } catch (error) {
        console.error(error)
    } finally {
        loading.value = false
    }
}

// ============================================================
// Quick actions
// ============================================================
const quickActionLoading = ref<string | null>(null)

const doQuickAction = async (action: string, routerUuid: string, label: string) => {
    try {
        quickActionLoading.value = `${action}-${routerUuid}`
        const resp = await makeRequest(t, '/admin', { action, router: routerUuid })
        if (resp.success) {
            showSnackbar(`${label} success`, 'success')
        }
    } catch (error) {
        console.error(error)
    } finally {
        quickActionLoading.value = null
    }
}

// ============================================================
// Add / Edit
// ============================================================
const modalVisible = ref(false)
const modalLoading = ref(false)
const isEditing = computed(() => modalForm.value.uuid !== '')

const modalForm = ref({
    name: '',
    description: '',
    location: '',
    public: true,
    openPeering: true,
    autoPeering: true,
    sessionCapacity: 30,
    callbackUrl: '',
    agentSecret: '',
    ipv4: '',
    ipv6: '',
    ipv6LinkLocal: '',
    linkTypes: ['wireguard'] as string[],
    extensions: ['mp-bgp', 'extended-nexthop'] as string[],
    allowedPolicies: [
        RoutingPolicy.FULL,
        RoutingPolicy.TRANSIT,
        RoutingPolicy.PEER,
        RoutingPolicy.DOWNSTREAM,
        RoutingPolicy.UPSTREAM
    ] as RoutingPolicy[],
    uuid: ''
})

const resetForm = () => {
    modalForm.value = {
        name: '', description: '', location: '',
        public: true, openPeering: true, autoPeering: true,
        sessionCapacity: 30, callbackUrl: '', agentSecret: '',
        ipv4: '', ipv6: '', ipv6LinkLocal: '',
        linkTypes: ['wireguard'],
        extensions: ['mp-bgp', 'extended-nexthop'],
        allowedPolicies: [
            RoutingPolicy.FULL, RoutingPolicy.TRANSIT, RoutingPolicy.PEER,
            RoutingPolicy.DOWNSTREAM, RoutingPolicy.UPSTREAM
        ],
        uuid: ''
    }
}

const showAddOrEdit = (record?: RouterMetadata) => {
    modalVisible.value = true
    if (!record) {
        resetForm()
    } else {
        const f = modalForm.value
        f.name = record.name
        f.description = record.description || ''
        f.location = record.location || ''
        f.public = record.public || false
        f.openPeering = record.openPeering
        f.autoPeering = record.autoPeering
        f.sessionCapacity = record.sessionCapacity
        f.callbackUrl = record.callbackUrl || ''
        f.agentSecret = ''
        f.ipv4 = record.ipv4 || ''
        f.ipv6 = record.ipv6 || ''
        f.ipv6LinkLocal = record.ipv6LinkLocal || ''
        f.linkTypes = [...record.linkTypes]
        f.extensions = [...record.extensions]
        f.allowedPolicies = [...record.allowedPolicies]
        f.uuid = record.uuid
    }
}

const addOrEdit = async () => {
    const f = modalForm.value
    if (nullOrEmpty(f.name) ||
        nullOrEmpty(f.sessionCapacity) ||
        isNaN(Number(f.sessionCapacity)) ||
        Number(f.sessionCapacity) < 0 ||
        nullOrEmpty(f.callbackUrl) ||
        !Array.isArray(f.linkTypes) ||
        f.linkTypes.length < 1 ||
        !Array.isArray(f.allowedPolicies) ||
        f.allowedPolicies.length < 1) {
        showSnackbar(t('pages.peering.inputValid'), 'error')
        return
    }

    if (!isEditing.value && nullOrEmpty(f.agentSecret)) {
        showSnackbar(t('pages.peering.inputValid'), 'error')
        return
    }

    try {
        loading.value = true
        modalLoading.value = true
        const data: any = {
            action: 'setRouter',
            type: isEditing.value ? 'update' : 'add',
            name: f.name,
            description: f.description || null,
            location: f.location || null,
            public: !!f.public,
            openPeering: !!f.openPeering,
            autoPeering: !!f.autoPeering,
            sessionCapacity: Number(f.sessionCapacity),
            callbackUrl: f.callbackUrl,
            ipv4: f.ipv4 || null,
            ipv6: f.ipv6 || null,
            ipv6LinkLocal: f.ipv6LinkLocal || null,
            linkTypes: f.linkTypes,
            extensions: f.extensions,
            allowedPolicies: f.allowedPolicies,
        }

        if (!nullOrEmpty(f.agentSecret)) {
            data.agentSecret = f.agentSecret
        } else if (!isEditing.value) {
            data.agentSecret = ''
        }

        if (isEditing.value) {
            data.router = f.uuid
        }

        const resp = await makeRequest(t, '/admin', data)
        if (resp.success) {
            modalVisible.value = false
            await fetchRouters()
        }
    } catch (error) {
        console.error(error)
    } finally {
        loading.value = false
        modalLoading.value = false
    }
}
</script>

<template>
    <div class="admin-nodes-page">
        <div class="page-header">
            <h1 class="text-h4 font-weight-bold d-flex align-center justify-center ga-3 mb-1">
                <v-icon size="32" color="primary">mdi-earth</v-icon>
                {{ t('pages.manage.manageNodes') }}
            </h1>
            <p class="text-body-1 text-medium-emphasis">{{ t('pages.manage.nodes.subtitle') }}</p>
        </div>

        <v-container style="max-width: 1200px">
            <!-- Toolbar -->
            <div class="d-flex align-center flex-wrap ga-2 mb-6">
                <v-btn color="primary" variant="flat" rounded="pill" prepend-icon="mdi-plus" @click="showAddOrEdit()">
                    {{ t('pages.manage.nodes.add') }}
                </v-btn>
                <v-spacer />
                <v-btn variant="tonal" rounded="pill" prepend-icon="mdi-refresh" :loading="loading" @click="fetchRouters">
                    {{ t('pages.metrics.refresh') }}
                </v-btn>
            </div>

            <!-- Loading -->
            <div v-if="loading && routers.length === 0" class="d-flex justify-center pa-12">
                <v-progress-circular indeterminate color="primary" size="40" />
            </div>

            <!-- Data Table -->
            <v-card v-else rounded="xl" elevation="0" border>
                <v-data-table
                    :headers="headers"
                    :items="routers"
                    :loading="loading"
                    density="comfortable"
                    hover
                    :items-per-page="-1"
                    class="admin-nodes-table"
                >
                    <template #item.name="{ item }">
                        <div class="d-flex align-center ga-2">
                            <router-location-avatar :router="item" :hide-peering-dot="true" />
                            <div>
                                <div class="font-weight-medium">{{ item.name }}</div>
                                <div v-if="item.description" class="text-caption text-medium-emphasis">
                                    {{ item.description.length > 30 ? item.description.slice(0, 30) + '…' : item.description }}
                                </div>
                            </div>
                        </div>
                    </template>
                    <template #item.status="{ item }">
                        <v-chip
                            :color="getNodeStatus(item).color"
                            size="x-small"
                            variant="tonal"
                            class="font-weight-medium"
                        >
                            {{ getNodeStatus(item).label }}
                        </v-chip>
                    </template>
                    <template #item.sessionCount="{ item }">
                        <div class="d-flex align-center ga-2">
                            <v-chip
                                :color="sessionCapacityColor(item.sessionCount, item.sessionCapacity)"
                                size="x-small"
                                variant="tonal"
                                class="font-weight-medium"
                            >
                                {{ item.sessionCount }}/{{ item.sessionCapacity }}
                            </v-chip>
                        </div>
                    </template>
                    <template #item.agentStatus="{ item }">
                        <div class="d-flex align-center ga-1">
                            <span class="agent-dot" :class="isAgentOnline(item) ? 'agent-dot--online' : 'agent-dot--offline'" />
                            <span class="text-caption">{{ getAgentUptime(item) }}</span>
                        </div>
                    </template>
                    <template #item.linkTypes="{ item }">
                        <div class="d-flex flex-wrap ga-1">
                            <v-chip
                                v-for="lt in item.linkTypes"
                                :key="lt"
                                size="x-small"
                                variant="outlined"
                                color="primary"
                            >
                                {{ linkTypeLabels[lt] || lt }}
                            </v-chip>
                        </div>
                    </template>
                    <template #item.action="{ item }">
                        <div class="d-flex ga-1">
                            <v-btn
                                size="x-small"
                                variant="text"
                                color="primary"
                                @click="router.push(`/admin/nodes/${item.uuid}`)"
                            >
                                {{ t('pages.manage.nodes.view') }}
                            </v-btn>
                            <v-btn size="x-small" variant="text" @click="showAddOrEdit(item)">
                                {{ t('pages.manage.posts.edit') }}
                            </v-btn>
                            <v-btn
                                size="x-small"
                                variant="text"
                                color="error"
                                @click="confirmRemove(item)"
                            >
                                {{ t('pages.manage.session.remove') }}
                            </v-btn>
                        </div>
                    </template>
                </v-data-table>
            </v-card>
        </v-container>

        <!-- Add / Edit Dialog -->
        <v-dialog v-model="modalVisible" max-width="800" scrollable>
            <v-card rounded="xl">
                <v-card-title class="text-h6 pa-6 pb-2">
                    {{ isEditing ? t('pages.manage.posts.edit') : t('pages.manage.nodes.add') }}
                </v-card-title>
                <v-progress-linear v-if="modalLoading" indeterminate color="primary" />
                <v-card-text class="pa-6 pt-2">
                    <v-form>
                        <v-text-field variant="outlined" rounded="lg" density="comfortable"
                            v-model="modalForm.name"
                            :label="t('pages.manage.nodes.name')"
                        />
                        <v-textarea variant="outlined" rounded="lg" density="comfortable"
                            :rows="2"
                            v-model="modalForm.description"
                            :label="t('pages.manage.nodes.description')"
                        />
                        <v-text-field variant="outlined" rounded="lg" density="comfortable"
                            v-model="modalForm.location"
                            :label="t('pages.manage.nodes.location')"
                            placeholder="e.g. US, DE, JP"
                        />

                        <v-switch v-model="modalForm.public" :label="t('pages.manage.nodes.public')" color="primary" hide-details />
                        <v-switch v-model="modalForm.openPeering" :label="t('pages.manage.nodes.openPeering')" color="primary" hide-details />
                        <v-switch v-model="modalForm.autoPeering" :label="t('pages.manage.nodes.autoPeering')" color="primary" hide-details />

                        <v-text-field variant="outlined" rounded="lg" density="comfortable"
                            v-model="modalForm.sessionCapacity"
                            type="number"
                            :label="t('pages.manage.nodes.sessionCapacity')"
                        />
                        <v-text-field variant="outlined" rounded="lg" density="comfortable"
                            v-model="modalForm.callbackUrl"
                            :label="t('pages.manage.nodes.callbackUrl')"
                            placeholder="https://api.example.com/agent/:router/:action"
                        />
                        <v-text-field variant="outlined" rounded="lg" density="comfortable"
                            v-model="modalForm.agentSecret"
                            :label="t('pages.manage.nodes.agentSecret')"
                            :placeholder="isEditing ? t('pages.manage.nodes.resetSecretHint') : ''"
                            :hint="isEditing ? t('pages.manage.nodes.resetSecretHint') : undefined"
                            :persistent-hint="isEditing"
                        />

                        <v-text-field variant="outlined" rounded="lg" density="comfortable" v-model="modalForm.ipv4" :label="t('pages.metrics.interfaceIPv4')" placeholder="172.23.x.x" />
                        <v-text-field variant="outlined" rounded="lg" density="comfortable" v-model="modalForm.ipv6" :label="t('pages.metrics.interfaceIPv6')" placeholder="fd42:xxxx::x" />
                        <v-text-field variant="outlined" rounded="lg" density="comfortable" v-model="modalForm.ipv6LinkLocal" :label="t('pages.metrics.interfaceIPv6LinkLocal')" placeholder="fe80::xxxx" />

                        <div class="mb-2 font-weight-medium">{{ t('pages.manage.nodes.linkTypes') }}</div>
                        <div class="d-flex flex-wrap ga-2">
                            <v-checkbox v-model="modalForm.linkTypes" value="wireguard" :label="t('pages.peering[\'wireguard\']')" density="compact" hide-details />
                            <v-checkbox v-model="modalForm.linkTypes" value="openvpn" :label="t('pages.peering[\'openvpn\']')" density="compact" hide-details />
                            <v-checkbox v-model="modalForm.linkTypes" value="ipsec" :label="t('pages.peering[\'ipsec\']')" density="compact" hide-details />
                            <v-checkbox v-model="modalForm.linkTypes" value="gre" :label="t('pages.peering[\'gre\']')" density="compact" hide-details />
                            <v-checkbox v-model="modalForm.linkTypes" value="ip6gre" :label="t('pages.peering[\'ip6gre\']')" density="compact" hide-details />
                            <v-checkbox v-model="modalForm.linkTypes" value="direct" :label="t('pages.peering[\'direct\']')" density="compact" hide-details />
                        </div>

                        <div class="mb-2 mt-4 font-weight-medium">{{ t('pages.peering.bgpExtensions') }}</div>
                        <div class="d-flex flex-wrap ga-2">
                            <v-checkbox v-model="modalForm.extensions" value="mp-bgp" :label="t('pages.peering[\'mp-bgp\']')" density="compact" hide-details />
                            <v-checkbox v-model="modalForm.extensions" value="extended-nexthop" :label="t('pages.peering[\'extended-nexthop\']')" density="compact" hide-details />
                        </div>

                        <div class="mb-2 mt-4 font-weight-medium">{{ t('pages.manage.nodes.allowedPolicies') }}</div>
                        <div class="d-flex flex-wrap ga-2">
                            <v-checkbox v-model="modalForm.allowedPolicies" :value="RoutingPolicy.FULL" :label="t('pages.peering.routingPolicyTypes.FULL')" density="compact" hide-details />
                            <v-checkbox v-model="modalForm.allowedPolicies" :value="RoutingPolicy.TRANSIT" :label="t('pages.peering.routingPolicyTypes.TRANSIT')" density="compact" hide-details />
                            <v-checkbox v-model="modalForm.allowedPolicies" :value="RoutingPolicy.PEER" :label="t('pages.peering.routingPolicyTypes.PEER')" density="compact" hide-details />
                            <v-checkbox v-model="modalForm.allowedPolicies" :value="RoutingPolicy.DOWNSTREAM" :label="t('pages.peering.routingPolicyTypes.DOWNSTREAM')" density="compact" hide-details />
                            <v-checkbox v-model="modalForm.allowedPolicies" :value="RoutingPolicy.UPSTREAM" :label="t('pages.peering.routingPolicyTypes.UPSTREAM')" density="compact" hide-details />
                        </div>
                    </v-form>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn @click="modalVisible = false" rounded="xl" variant="text">{{ t('pages.manage.posts.close') }}</v-btn>
                    <v-btn color="primary" @click="addOrEdit()" :loading="modalLoading" rounded="xl" variant="flat">{{ t('pages.manage.config.save') }}</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- Confirm Delete Dialog -->
        <v-dialog v-model="confirmDeleteVisible" max-width="400">
            <v-card rounded="xl" class="pa-4">
                <v-card-text class="text-body-1">{{ t('pages.manage.session.areYouSure') }}</v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn @click="confirmDeleteVisible = false" rounded="xl" variant="text">{{ t('pages.manage.posts.close') }}</v-btn>
                    <v-btn color="error" @click="doRemove()" rounded="xl" variant="flat">{{ t('pages.manage.session.remove') }}</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<style scoped>
.admin-nodes-page {
    min-height: 100vh;
}
.page-header {
    text-align: center;
    padding: 2rem 1rem 1rem;
}
.admin-nodes-table :deep(thead) {
    background-color: rgb(var(--v-theme-surface-variant));
}
.agent-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
}
.agent-dot--online {
    background-color: rgb(var(--v-theme-success));
}
.agent-dot--offline {
    background-color: rgb(var(--v-theme-on-surface-variant));
    opacity: 0.4;
}
</style>
