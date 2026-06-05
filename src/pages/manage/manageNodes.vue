<script setup lang="ts">
import { onMounted, Ref, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { loggedIn, nullOrEmpty, showSnackbar } from '../../common/helper'
import { makeRequest, RouterMetadata, RoutersResponse, RoutingPolicy } from '../../common/packetHandler'
import RouterLocationAvatar from '../../components/RouterLocationAvatar.vue'

const t = useI18n().t
const router = useRouter()

const loading = ref(false)

const routers: Ref<RouterMetadata[]> = ref([])
const fetchRouters = async () => {
    try {
        loading.value = true
        const resp = await makeRequest(t, '/admin', {
            action: "enumRouters",
        })
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

onMounted(async () => {
    if (!loggedIn.value) {
        showSnackbar(t('pages.nodes.pleaseSignIn'), 'info')
        router.replace({ path: '/signin' })
        return
    }
    await fetchRouters()
})

const headers = ref([
    { title: t('pages.manage.nodes.name'), key: 'name', sortable: true },
    { title: t('pages.manage.nodes.location'), key: 'location', sortable: true },
    { title: t('pages.manage.nodes.public'), key: 'public', sortable: true },
    { title: t('pages.manage.nodes.openPeering'), key: 'openPeering', sortable: true },
    { title: t('pages.manage.nodes.autoPeering'), key: 'autoPeering', sortable: true },
    { title: t('pages.manage.nodes.sessionCapacity'), key: 'sessionCapacity', sortable: true },
    { title: 'IPv4', key: 'ipv4', sortable: true },
    { title: 'IPv6', key: 'ipv6', sortable: true },
    { title: 'IPv6 Link Local', key: 'ipv6LinkLocal', sortable: true },
    { title: t('pages.manage.session.action'), key: 'action', sortable: false },
])

const remove = async (record: RouterMetadata) => {
    try {
        loading.value = true
        await makeRequest(t, '/admin', {
            action: 'deleteRouter',
            router: record.uuid
        })
    } catch (error) {
        console.error(error)
    } finally {
        loading.value = false
        fetchRouters()
    }
}

const modalVisible = ref(false)
const modalLoading = ref(false)
const confirmDeleteVisible = ref(false)
const recordToDelete: Ref<RouterMetadata | null> = ref(null)
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
    linkTypes: ['wireguard'],
    extensions: ['mp-bgp', 'extended-nexthop'],
    allowedPolicies: [
        RoutingPolicy.FULL,
        RoutingPolicy.TRANSIT,
        RoutingPolicy.PEER,
        RoutingPolicy.DOWNSTREAM,
        RoutingPolicy.UPSTREAM
    ],
    uuid: ''
})

const addOrEdit = async () => {
    if (nullOrEmpty(modalForm.value.name) ||
        nullOrEmpty(modalForm.value.sessionCapacity) ||
        isNaN(Number(modalForm.value.sessionCapacity)) ||
        nullOrEmpty(modalForm.value.agentSecret) ||
        nullOrEmpty(modalForm.value.callbackUrl) ||
        !Array.isArray(modalForm.value.linkTypes) ||
        modalForm.value.linkTypes.length < 1 ||
        !Array.isArray(modalForm.value.allowedPolicies) ||
        modalForm.value.allowedPolicies.length < 1) {
        showSnackbar(t('pages.peering.inputValid'), 'error')
        return
    }
    try {
        loading.value = true
        modalLoading.value = true
        const data: any = {
            action: 'setRouter',
            type: modalForm.value.uuid !== '' ? 'update' : 'add',
            name: modalForm.value.name,
            description: modalForm.value.description || null,
            location: modalForm.value.location || null,
            public: !!modalForm.value.public,
            openPeering: !!modalForm.value.openPeering,
            autoPeering: !!modalForm.value.autoPeering,
            sessionCapacity: Number(modalForm.value.sessionCapacity),
            callbackUrl: modalForm.value.callbackUrl,
            agentSecret: modalForm.value.agentSecret || null,
            ipv4: modalForm.value.ipv4 || null,
            ipv6: modalForm.value.ipv6 || null,
            ipv6LinkLocal: modalForm.value.ipv6LinkLocal || null,
            linkTypes: modalForm.value.linkTypes,
            extensions: modalForm.value.extensions,
            allowedPolicies: modalForm.value.allowedPolicies,
        }
        if (modalForm.value.uuid !== '') Object.assign(data, { router: modalForm.value.uuid })
        await makeRequest(t, '/admin', data)
    } catch (error) {
        console.error(error)
    } finally {
        loading.value = false
        modalLoading.value = false
        modalVisible.value = false
        fetchRouters()
    }
}

const showAddOrEdit = async (record?: RouterMetadata) => {
    modalVisible.value = true
    if (!record) {
        modalForm.value = {
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
            linkTypes: ['wireguard'],
            extensions: ['mp-bgp', 'extended-nexthop'],
            allowedPolicies: [
                RoutingPolicy.FULL,
                RoutingPolicy.TRANSIT,
                RoutingPolicy.PEER,
                RoutingPolicy.DOWNSTREAM,
                RoutingPolicy.UPSTREAM
            ],
            uuid: ''
        }
    } else {
        modalForm.value.name = record.name
        modalForm.value.description = record.description
        modalForm.value.location = record.location
        modalForm.value.public = record.public || false
        modalForm.value.openPeering = record.openPeering
        modalForm.value.autoPeering = record.autoPeering
        modalForm.value.sessionCapacity = record.sessionCapacity
        modalForm.value.callbackUrl = record.callbackUrl || ''
        modalForm.value.agentSecret = record.agentSecret || ''
        modalForm.value.ipv4 = record.ipv4
        modalForm.value.ipv6 = record.ipv6
        modalForm.value.ipv6LinkLocal = record.ipv6LinkLocal
        modalForm.value.linkTypes = record.linkTypes
        modalForm.value.extensions = record.extensions
        modalForm.value.allowedPolicies = [...record.allowedPolicies]
        modalForm.value.uuid = record.uuid
    }
}

const confirmRemove = (record: RouterMetadata) => {
    recordToDelete.value = record
    confirmDeleteVisible.value = true
}

const doRemove = async () => {
    if (recordToDelete.value) {
        await remove(recordToDelete.value)
    }
    confirmDeleteVisible.value = false
    recordToDelete.value = null
}
</script>

<template>
    <div class="manage-nodes-wrapper">
        <div class="toolbar-row">
            <v-btn @click="showAddOrEdit()" color="primary" variant="flat" rounded="xl">
                <v-icon start>mdi-earth</v-icon>
                {{ t('pages.manage.nodes.add') }}
            </v-btn>
            <v-btn @click="fetchRouters" :loading="loading" variant="tonal" rounded="xl">
                <v-icon start>mdi-refresh</v-icon>
                {{ t('pages.metrics.refresh') }}
            </v-btn>
        </div>
        <v-data-table
            :headers="headers"
            :items="routers"
            :loading="loading"
            density="comfortable"
            hover
            rounded="lg"
            :items-per-page="-1"
            class="md3-table"
        >
            <template #item.location="{ item }">
                <router-location-avatar v-if="item.location" :router="item"
                    :hide-peering-dot="true"></router-location-avatar>
                <v-icon v-else size="small">mdi-close</v-icon>
            </template>
            <template #item.ipv4="{ item }">
                <span v-if="item.ipv4" class="small-text">{{ item.ipv4 }}</span>
                <v-icon v-else size="small">mdi-close</v-icon>
            </template>
            <template #item.ipv6="{ item }">
                <span v-if="item.ipv6" class="small-text">{{ item.ipv6 }}</span>
                <v-icon v-else size="small">mdi-close</v-icon>
            </template>
            <template #item.ipv6LinkLocal="{ item }">
                <span v-if="item.ipv6LinkLocal" class="small-text">{{ item.ipv6LinkLocal }}</span>
                <v-icon v-else size="small">mdi-close</v-icon>
            </template>
            <template #item.public="{ item }">
                <v-icon v-if="item.public" size="small" color="success">mdi-check-circle</v-icon>
                <v-icon v-else size="small">mdi-close</v-icon>
            </template>
            <template #item.openPeering="{ item }">
                <v-icon v-if="item.openPeering" size="small" color="success">mdi-check-circle</v-icon>
                <v-icon v-else size="small">mdi-close</v-icon>
            </template>
            <template #item.autoPeering="{ item }">
                <v-icon v-if="item.autoPeering" size="small" color="success">mdi-check-circle</v-icon>
                <v-icon v-else size="small">mdi-close</v-icon>
            </template>
            <template #item.action="{ item }">
                <div class="d-flex ga-1">
                    <v-btn size="x-small" variant="text" color="primary" @click="showAddOrEdit(item)">{{ t('pages.manage.posts.edit') }}</v-btn>
                    <v-btn size="x-small" variant="text" color="error" @click="confirmRemove(item)">{{ t('pages.manage.session.remove') }}</v-btn>
                </div>
            </template>
        </v-data-table>

        <!-- Add/Edit Dialog -->
        <v-dialog v-model="modalVisible" max-width="800" scrollable>
            <v-card rounded="xl">
                <v-card-title class="text-h6 pa-6 pb-2">{{ t('pages.manage.nodes.addOrEdit') }}</v-card-title>
                <v-progress-linear v-if="modalLoading" indeterminate color="primary" />
                <v-card-text class="pa-6 pt-2">
                    <v-form class="modalForm">
                        <v-text-field variant="outlined" rounded="lg" density="comfortable"
                            v-model="modalForm.name"
                            :label="t('pages.manage.nodes.name')"
                            :placeholder="t('pages.manage.nodes.name')"
                        />
                        <v-textarea variant="outlined" rounded="lg" density="comfortable"
                            :rows="2"
                            v-model="modalForm.description"
                            :label="t('pages.manage.nodes.description')"
                            :placeholder="t('pages.manage.nodes.description')"
                        />
                        <v-text-field variant="outlined" rounded="lg" density="comfortable"
                            v-model="modalForm.location"
                            :label="t('pages.manage.nodes.location')"
                            :placeholder="t('pages.manage.nodes.location')"
                        />
                        <v-switch
                            v-model="modalForm.public"
                            :label="t('pages.manage.nodes.public')"
                            color="primary"
                            hide-details
                        />
                        <v-switch
                            v-model="modalForm.openPeering"
                            :label="t('pages.manage.nodes.openPeering')"
                            color="primary"
                            hide-details
                        />
                        <v-switch
                            v-model="modalForm.autoPeering"
                            :label="t('pages.manage.nodes.autoPeering')"
                            color="primary"
                            hide-details
                        />
                        <v-text-field variant="outlined" rounded="lg" density="comfortable"
                            v-model="modalForm.sessionCapacity"
                            type="number"
                            :label="t('pages.manage.nodes.sessionCapacity')"
                            :placeholder="t('pages.manage.nodes.sessionCapacity')"
                        />
                        <v-text-field variant="outlined" rounded="lg" density="comfortable"
                            v-model="modalForm.callbackUrl"
                            :label="t('pages.manage.nodes.callbackUrl')"
                            :placeholder="t('pages.manage.nodes.callbackUrl')"
                        />
                        <v-text-field variant="outlined" rounded="lg" density="comfortable"
                            v-model="modalForm.agentSecret"
                            label="Agent Secret"
                            placeholder="Agent Secret"
                        />
                        <v-text-field variant="outlined" rounded="lg" density="comfortable" v-model="modalForm.ipv4" label="IPv4" />
                        <v-text-field variant="outlined" rounded="lg" density="comfortable" v-model="modalForm.ipv6" label="IPv6" />
                        <v-text-field variant="outlined" rounded="lg" density="comfortable" v-model="modalForm.ipv6LinkLocal" label="IPv6 Link Local" />

                        <div class="mb-2 font-weight-medium">{{ t('pages.peering.linkType') }}</div>
                        <v-checkbox v-model="modalForm.linkTypes" value="wireguard" :label="t('pages.peering[\'wireguard\']')" density="compact" hide-details />
                        <v-checkbox v-model="modalForm.linkTypes" value="openvpn" :label="t('pages.peering[\'openvpn\']')" density="compact" hide-details />
                        <v-checkbox v-model="modalForm.linkTypes" value="ipsec" :label="t('pages.peering[\'ipsec\']')" density="compact" hide-details />
                        <v-checkbox v-model="modalForm.linkTypes" value="gre" :label="t('pages.peering[\'gre\']')" density="compact" hide-details />
                        <v-checkbox v-model="modalForm.linkTypes" value="ip6gre" :label="t('pages.peering[\'ip6gre\']')" density="compact" hide-details />
                        <v-checkbox v-model="modalForm.linkTypes" value="direct" :label="t('pages.peering[\'direct\']')" density="compact" hide-details />

                        <div class="mb-2 mt-4 font-weight-medium">{{ t('pages.peering.bgpExtensions') }}</div>
                        <v-checkbox v-model="modalForm.extensions" value="mp-bgp" :label="t('pages.peering[\'mp-bgp\']')" density="compact" hide-details />
                        <v-checkbox v-model="modalForm.extensions" value="extended-nexthop" :label="t('pages.peering[\'extended-nexthop\']')" density="compact" hide-details />

                        <div class="mb-2 mt-4 font-weight-medium">{{ t('pages.manage.nodes.allowedPolicies') }}</div>
                        <v-checkbox v-model="modalForm.allowedPolicies" :value="RoutingPolicy.FULL" :label="t('pages.peering.routingPolicyTypes.FULL')" density="compact" hide-details />
                        <v-checkbox v-model="modalForm.allowedPolicies" :value="RoutingPolicy.TRANSIT" :label="t('pages.peering.routingPolicyTypes.TRANSIT')" density="compact" hide-details />
                        <v-checkbox v-model="modalForm.allowedPolicies" :value="RoutingPolicy.PEER" :label="t('pages.peering.routingPolicyTypes.PEER')" density="compact" hide-details />
                        <v-checkbox v-model="modalForm.allowedPolicies" :value="RoutingPolicy.DOWNSTREAM" :label="t('pages.peering.routingPolicyTypes.DOWNSTREAM')" density="compact" hide-details />
                        <v-checkbox v-model="modalForm.allowedPolicies" :value="RoutingPolicy.UPSTREAM" :label="t('pages.peering.routingPolicyTypes.UPSTREAM')" density="compact" hide-details />
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
                    <v-btn color="primary" @click="doRemove()" rounded="xl" variant="flat">{{ t('pages.manage.session.remove') }}</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<style scoped>
.manage-nodes-wrapper {
    margin-top: 8px;
}
.toolbar-row {
    display: flex;
    gap: 10px;
    margin-bottom: 16px;
    flex-wrap: wrap;
}
.small-text {
    font-size: 12px;
}
.modalForm {
    max-width: 100%;
}
.md3-table {
    border-radius: 12px;
    overflow: hidden;
}
.md3-table :deep(thead) {
    background-color: rgb(var(--v-theme-surface-variant));
}
</style>
