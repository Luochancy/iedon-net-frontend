<script setup lang="ts">
import { computed, PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { SessionStatus, RouterMetadata, SessionMetadata } from '../common/packetHandler'
import { formatRelativeTime, deriveProbeStatuses, getProbeStatusWeight, themeName, ProbeStatusKey } from '../common/helper'
import RouterLocationAvatar from './RouterLocationAvatar.vue'

const t = useI18n().t

interface Session extends SessionMetadata {
    routerJoined?: RouterMetadata
    asn?: string
}

// Props
const props = defineProps({
    sessions: {
        type: Array as PropType<Session[]>,
        required: true
    },
    loading: {
        type: Boolean,
        default: false
    },
    showAsn: {
        type: Boolean,
        default: false
    },
    showActions: {
        type: Boolean,
        default: true
    },
    isAdminMode: {
        type: Boolean,
        default: false
    },
    searchKeywords: {
        type: String,
        default: ''
    }
})

// Emits
const emit = defineEmits<{
    viewMetrics: [session: Session, event: MouseEvent]
    enable: [session: Session]
    disable: [session: Session]
    remove: [session: Session]
    approve: [session: Session]
    edit: [session: Session]
}>()

// Computed columns
const columns = computed(() => {
    const baseColumns: any[] = [
        {
            title: t('pages.manage.session.node'),
            dataIndex: 'node',
            key: 'node',
            sorter: (a: Session, b: Session) => ('' + (a.routerJoined?.name || '')).localeCompare((b.routerJoined?.name || ''))
        }
    ]

    if (props.showAsn) {
        baseColumns.push({
            title: 'ASN',
            dataIndex: 'asn',
            key: 'asn',
            align: 'center',
            sorter: (a: Session, b: Session) => Number(a.asn || 0) - Number(b.asn || 0)
        })
    }

    baseColumns.push(
        {
            title: t('pages.manage.session.type'),
            dataIndex: 'type',
            key: 'type',
            align: 'center',
            sorter: (a: Session, b: Session) => ('' + a.type).localeCompare(b.type)
        },
        {
            title: 'IP',
            dataIndex: 'addresses',
            key: 'addresses',
            align: 'center',
            sorter: (a: Session, b: Session) => getAddressSortValue(a).localeCompare(getAddressSortValue(b))
        },
        {
            title: t('pages.metrics.createdAt'),
            dataIndex: 'createdAt',
            key: 'createdAt',
            align: 'center',
            sorter: (a: Session, b: Session) => {
                const aTime = new Date(a.createdAt || 0).getTime()
                const bTime = new Date(b.createdAt || 0).getTime()
                return bTime - aTime // Descending order (newest first)
            }
        },
        {
            title: t('pages.manage.session.status'),
            dataIndex: 'status',
            key: 'status',
            align: 'center',
            sorter: (a: Session, b: Session) => {
                return getStatusSortValue(b) - getStatusSortValue(a) // Descending order (better status first)
            }
        },
        {
            title: t('pages.manage.session.probeStatus'),
            dataIndex: 'probe',
            key: 'probe',
            align: 'center',
            sorter: (a: Session, b: Session) => getProbeSortValue(b) - getProbeSortValue(a)
        }
    )

    if (props.showActions) {
        baseColumns.push({
            title: t('pages.manage.session.action'),
            dataIndex: 'action',
            key: 'action'
        })
    }

    return baseColumns
})

// Filtered sessions
const filteredSessions = computed(() => {
    if (props.searchKeywords.length === 0) return props.sessions
    return props.sessions.filter((session: Session) => {
        const searchLower = props.searchKeywords.toLowerCase()
        return (
            (session.asn !== undefined && session.asn !== null && session.asn.toString().toLowerCase().indexOf(searchLower) !== -1) ||
            (session.ipv4 !== undefined && session.ipv4 !== null && session.ipv4.toLowerCase().indexOf(searchLower) !== -1) ||
            (session.ipv6 !== undefined && session.ipv6 !== null && session.ipv6.toLowerCase().indexOf(searchLower) !== -1) ||
            (session.ipv6LinkLocal !== undefined && session.ipv6LinkLocal !== null && session.ipv6LinkLocal.toLowerCase().indexOf(searchLower) !== -1) ||
            (session.routerJoined?.name !== undefined && session.routerJoined.name.toLowerCase().indexOf(searchLower) !== -1)
        )
    })
})

// Event handlers
const handleViewMetrics = (session: Session, event: MouseEvent) => {
    emit('viewMetrics', session, event)
}

const handleEnable = (session: Session) => {
    emit('enable', session)
}

const handleDisable = (session: Session) => {
    emit('disable', session)
}

const handleRemove = (session: Session) => {
    emit('remove', session)
}

const handleApprove = (session: Session) => {
    emit('approve', session)
}

const handleEdit = (session: Session) => {
    emit('edit', session)
}

const customRow = (record: any, index: number) => {
    return {
        onClick: (event: MouseEvent) => handleViewMetrics(record, event)
    }
}

const stopPropagation = (event: MouseEvent) => event.stopPropagation()

// Status color mapping
const getStatusColor = (status: SessionStatus) => {
    switch (status) {
        case SessionStatus.ENABLED:
            return 'green'
        case SessionStatus.DISABLED:
            return 'geekblue'
        case SessionStatus.PENDING_APPROVAL:
            return 'orange'
        case SessionStatus.PROBLEM:
            return 'volcano'
        case SessionStatus.QUEUED_FOR_SETUP:
            return 'blue'
        case SessionStatus.QUEUED_FOR_DELETE:
            return 'red'
        case SessionStatus.TEARDOWN:
            return 'gray'
        case SessionStatus.DELETED:
            return 'default'
        default:
            return 'default'
    }
}

// BGP Status processing
const getBgpStatusDisplay = (session: Session) => {
    if (session.status !== SessionStatus.ENABLED || !session.bgpStatus || !Array.isArray(session.bgpStatus) || session.bgpStatus.length === 0) {
        return null
    }

    // sort by type: ipv4, ipv6, mpbgp
    session.bgpStatus.sort((a, b) => {
        const typeOrder = { 'ipv4': 1, 'ipv6': 2, 'mpbgp': 3, '': 4 }
        return (typeOrder[a.type || ''] || 5) - (typeOrder[b.type || ''] || 5)
    })

    return session.bgpStatus.map((bgp, index) => {
        const firstWord = bgp.info ? bgp.info.split(' ')[0] : 'Unknown'
        const statusText = t(`pages.metrics.bgpStatus['${bgp.info?.split(' ')[0] || 'Unknown'}']`)

        // For IPv4 and IPv6 types, show formatted display with protocol prefix
        if (bgp.type === 'ipv4') {
            return {
                text: statusText,
                color: firstWord === 'Established' ? 'green' : 'red',
                key: `${session.uuid}-bgp-${index}`,
                type: 'ipv4',
                connected: firstWord === 'Established'
            }
        } else if (bgp.type === 'ipv6') {
            return {
                text: statusText,
                color: firstWord === 'Established' ? 'green' : 'red',
                key: `${session.uuid}-bgp-${index}`,
                type: 'ipv6',
                connected: firstWord === 'Established'
            }
        } else {
            // For mpbgp or empty type, keep current format
            return {
                text: statusText,
                color: firstWord === 'Established' ? 'green' : 'red',
                key: `${session.uuid}-bgp-${index}`,
                connected: firstWord === 'Established'
            }
        }
    })
}

const getAddressSortValue = (session: Session) => {
    return [session.ipv4 || '', session.ipv6 || '', session.ipv6LinkLocal || ''].join('|')
}

// Helper function for sorting status
const getStatusSortValue = (session: Session) => {
    const probeScore = getProbeSortValue(session)
    const bgpDisplay = getBgpStatusDisplay(session)
    if (bgpDisplay) {
        const establishedCount = bgpDisplay.filter(bgp => bgp.text === 'Established').length
        const totalCount = bgpDisplay.length
        // Composite sort value: session status * 1000 + established count * 10 + total count + probe signal
        return session.status * 1000 + establishedCount * 10 + totalCount + probeScore
    }
    return session.status * 1000 + probeScore
}

const PROBE_STATUS_ICONS: Record<ProbeStatusKey, string> = {
    testedOk: 'mdi-check-circle',
    noRouting: 'mdi-close-circle',
    nat: 'mdi-alert-circle',
    notAvailable: 'mdi-clock-outline'
}

const getProbeStatusDisplay = (session: Session) => {
    const statuses = deriveProbeStatuses(session.probe || null)
    if (!statuses.length) return []
    return statuses.map(status => ({
        ...status,
        label: t(`pages.metrics.probeStatus.labels.${status.key}`),
        description: t(`pages.metrics.probeStatus.descriptions.${status.key}`),
        color: PROBE_STATUS_COLORS[status.key],
        icon: PROBE_STATUS_ICONS[status.key],
        timestamp: status.timestamp
    }))
}

const getProbeSortValue = (session: Session) => {
    const statuses = deriveProbeStatuses(session.probe || null)
    if (!statuses.length) return 0
    return statuses.reduce((acc, status) => acc + getProbeStatusWeight(status.key), 0)
}

const PROBE_STATUS_COLORS: Record<ProbeStatusKey, string> = {
  testedOk: 'green',
  noRouting: 'red',
  nat: 'orange',
  notAvailable: 'default'
}
</script>

<template>
    <div class="session-table-wrapper">
        <div v-if="loading" class="d-flex justify-center align-center py-8">
            <v-progress-circular indeterminate color="primary" size="40" />
        </div>
        <v-data-table
            class="session-table"
            :class="themeName"
            :headers="columns.map((c: any) => ({ title: c.title, key: c.dataIndex, sortable: !!c.sorter, align: c.align || 'start' }))"
            :items="filteredSessions"
            density="comfortable"
            hover
            rounded="lg"
            :items-per-page="-1"
            hide-default-footer
            @click:row="(_event: any, { item }: any) => handleViewMetrics(item, _event)"
        >
            <!-- Node Column -->
            <template #item.node="{ item }">
                <div class="avatar-container">
                    <router-location-avatar :router="item.routerJoined" :hide-peering-dot="true" />
                    <span class="node small-text">
                        {{ item.routerJoined?.name }}
                    </span>
                </div>
            </template>

            <!-- ASN Column -->
            <template #item.asn="{ item }">
                <span class="small-text">{{ item.asn }}</span>
            </template>

            <!-- Type Column -->
            <template #item.type="{ item }">
                <span class="small-text">
                    {{ t(`pages.peering['${item.type}']`) }}
                </span>
            </template>

            <!-- IP Addresses Column -->
            <template #item.addresses="{ item }">
                <div class="ip-stack small-text">
                    <div class="ip-row">
                        <span class="ip-label">IPv4</span>
                        <span v-if="item.ipv4" class="ip-value">{{ item.ipv4 }}</span>
                        <span v-else class="ip-empty"><v-icon size="12">mdi-close</v-icon></span>
                    </div>
                    <div class="ip-row">
                        <span class="ip-label">IPv6</span>
                        <span v-if="item.ipv6" class="ip-value">{{ item.ipv6 }}</span>
                        <span v-else class="ip-empty"><v-icon size="12">mdi-close</v-icon></span>
                    </div>
                    <div class="ip-row">
                        <span class="ip-label">Link</span>
                        <span v-if="item.ipv6LinkLocal" class="ip-value">{{ item.ipv6LinkLocal }}</span>
                        <span v-else class="ip-empty"><v-icon size="12">mdi-close</v-icon></span>
                    </div>
                </div>
            </template>
            
            <!-- Status Column -->
            <template #item.status="{ item }">
                <template v-if="getBgpStatusDisplay(item)">
                    <!-- Show detailed BGP status when available -->
                    <div class="bgpStatus" v-for="bgpStatus in getBgpStatusDisplay(item)" :key="bgpStatus.key">
                        <v-chip v-if="bgpStatus.type === 'ipv4'" size="x-small" :color="bgpStatus.color === 'green' ? 'success' : 'error'" variant="flat"
                            class="status-tag">
                            <v-icon v-if="!bgpStatus.connected" start size="10" class="spin-icon">mdi-refresh</v-icon>
                            <span>V4</span>
                            <span class="divider-vertical" />
                            <span>{{ bgpStatus.text }}</span>
                        </v-chip>
                        <v-chip v-else-if="bgpStatus.type === 'ipv6'" size="x-small" :color="bgpStatus.color === 'green' ? 'success' : 'error'" variant="flat"
                            class="status-tag">
                            <v-icon v-if="!bgpStatus.connected" start size="10" class="spin-icon">mdi-refresh</v-icon>
                            <span>V6</span>
                            <span class="divider-vertical" />
                            <span>{{ bgpStatus.text }}</span>
                        </v-chip>
                        <v-chip v-else size="x-small" :color="bgpStatus.color === 'green' ? 'success' : 'error'" variant="flat" class="status-tag">
                            <v-icon v-if="!bgpStatus.connected" start size="10" class="spin-icon">mdi-refresh</v-icon>
                            {{ bgpStatus.text }}
                        </v-chip>
                    </div>
                </template>
                <template v-else>
                    <!-- Show regular status -->
                     <div class="bgpStatus">
                        <v-chip size="x-small" :color="getStatusColor(item.status) === 'green' ? 'success' : getStatusColor(item.status) === 'red' ? 'error' : getStatusColor(item.status) === 'orange' ? 'warning' : getStatusColor(item.status) === 'blue' ? 'info' : 'grey'" variant="flat" class="status-tag">
                            {{ t(`pages.manage.session.statusCode['${item.status}']`) }}
                        </v-chip>
                    </div>
                </template>
            </template>

            <!-- Probe Status Column -->
            <template #item.probe="{ item }">
                <template v-if="getProbeStatusDisplay(item).length">
                    <div class="probe-status-compact">
                        <v-tooltip
                            v-for="probeStatus in getProbeStatusDisplay(item)"
                            :key="`${item.uuid}-${probeStatus.version}`"
                            :text="`${probeStatus.description}${probeStatus.timestamp ? ` (${new Date(probeStatus.timestamp * 1000).toLocaleString()})` : '' }`"
                        >
                            <template #activator="{ props: tooltipProps }">
                                <v-chip v-bind="tooltipProps" size="x-small" :color="probeStatus.color === 'green' ? 'success' : probeStatus.color === 'red' ? 'error' : probeStatus.color === 'orange' ? 'warning' : 'grey'" variant="flat" class="probe-tag compact">
                                    <v-icon v-if="probeStatus.color !== 'default' && probeStatus.color !== 'green'" start size="10">
                                        {{ probeStatus.icon }}
                                    </v-icon>
                                    <span>{{ probeStatus.version === 'ipv4' ? 'V4' : 'V6' }}</span>
                                    <span class="divider-vertical" />
                                    <span>{{ probeStatus.label }}</span>
                                </v-chip>
                            </template>
                        </v-tooltip>
                    </div>
                </template>
                <span v-else class="small-text muted">
                    {{ t('pages.metrics.probeStatus.labels.notAvailable') }}
                </span>
            </template>

            <!-- Created At Column -->
            <template #item.createdAt="{ item }">
                <span v-if="item.createdAt" class="small-text" :title="new Date(item.createdAt).toLocaleString()">
                    {{ formatRelativeTime(item.createdAt, t) }}
                </span>
                <span v-else class="small-text">{{ t('pages.metrics.notAvailable') }}</span>
            </template>
            
            <!-- Action Column -->
            <template #item.action="{ item }">
                <div class="action-btn-group">
                    <!-- View Metrics Button -->
                    <v-tooltip :text="t('pages.manage.session.viewMetrics')">
                        <template #activator="{ props }">
                            <v-btn v-bind="props" color="primary" size="x-small" @click.stop="handleViewMetrics(item, $event)">
                                <v-icon size="14">mdi-magnify</v-icon>
                            </v-btn>
                        </template>
                    </v-tooltip>

                    <template v-if="isAdminMode">
                        <!-- Admin Actions -->
                        <v-tooltip v-if="item.status === SessionStatus.ENABLED || item.status === SessionStatus.PROBLEM"
                            :text="t('pages.manage.session.disable')">
                            <template #activator="{ props: tooltipProps }">
                                <v-dialog max-width="400">
                                    <template #activator="{ props: dialogProps }">
                                        <v-btn v-bind="{ ...tooltipProps, ...dialogProps }" size="x-small" @click.stop>
                                            <v-icon size="14">mdi-pause</v-icon>
                                        </v-btn>
                                    </template>
                                    <template #default="{ isActive }">
                                        <v-card>
                                            <v-card-text>{{ t('pages.manage.session.areYouSure') }}</v-card-text>
                                            <v-card-actions>
                                                <v-spacer />
                                                <v-btn @click="isActive.value = false">Cancel</v-btn>
                                                <v-btn color="primary" @click="handleDisable(item); isActive.value = false">OK</v-btn>
                                            </v-card-actions>
                                        </v-card>
                                    </template>
                                </v-dialog>
                            </template>
                        </v-tooltip>

                        <v-tooltip v-else-if="item.status === SessionStatus.DISABLED || item.status === SessionStatus.TEARDOWN"
                            :text="t('pages.manage.session.enable')">
                            <template #activator="{ props: tooltipProps }">
                                <v-dialog max-width="400">
                                    <template #activator="{ props: dialogProps }">
                                        <v-btn v-bind="{ ...tooltipProps, ...dialogProps }" size="x-small" @click.stop>
                                            <v-icon size="14">mdi-play</v-icon>
                                        </v-btn>
                                    </template>
                                    <template #default="{ isActive }">
                                        <v-card>
                                            <v-card-text>{{ t('pages.manage.session.areYouSure') }}</v-card-text>
                                            <v-card-actions>
                                                <v-spacer />
                                                <v-btn @click="isActive.value = false">Cancel</v-btn>
                                                <v-btn color="primary" @click="handleEnable(item); isActive.value = false">OK</v-btn>
                                            </v-card-actions>
                                        </v-card>
                                    </template>
                                </v-dialog>
                            </template>
                        </v-tooltip>

                        <v-tooltip v-else-if="item.status === SessionStatus.PENDING_APPROVAL"
                            :text="t('pages.manage.session.approve')">
                            <template #activator="{ props: tooltipProps }">
                                <v-dialog max-width="400">
                                    <template #activator="{ props: dialogProps }">
                                        <v-btn v-bind="{ ...tooltipProps, ...dialogProps }" size="x-small" @click.stop>
                                            <v-icon size="14">mdi-check-circle</v-icon>
                                        </v-btn>
                                    </template>
                                    <template #default="{ isActive }">
                                        <v-card>
                                            <v-card-text>{{ t('pages.manage.session.areYouSure') }}</v-card-text>
                                            <v-card-actions>
                                                <v-spacer />
                                                <v-btn @click="isActive.value = false">Cancel</v-btn>
                                                <v-btn color="primary" @click="handleApprove(item); isActive.value = false">OK</v-btn>
                                            </v-card-actions>
                                        </v-card>
                                    </template>
                                </v-dialog>
                            </template>
                        </v-tooltip>
                    </template>

                    <template v-else>
                        <!-- User Actions -->
                        <v-tooltip v-if="item.status === SessionStatus.ENABLED || item.status === SessionStatus.PROBLEM"
                            :text="t('pages.manage.session.disable')">
                            <template #activator="{ props: tooltipProps }">
                                <v-dialog max-width="400">
                                    <template #activator="{ props: dialogProps }">
                                        <v-btn v-bind="{ ...tooltipProps, ...dialogProps }" size="x-small" @click.stop>
                                            <v-icon size="14">mdi-pause</v-icon>
                                        </v-btn>
                                    </template>
                                    <template #default="{ isActive }">
                                        <v-card>
                                            <v-card-text>{{ t('pages.manage.session.areYouSure') }}</v-card-text>
                                            <v-card-actions>
                                                <v-spacer />
                                                <v-btn @click="isActive.value = false">Cancel</v-btn>
                                                <v-btn color="primary" @click="handleDisable(item); isActive.value = false">OK</v-btn>
                                            </v-card-actions>
                                        </v-card>
                                    </template>
                                </v-dialog>
                            </template>
                        </v-tooltip>

                        <v-tooltip v-else-if="item.status === SessionStatus.DISABLED"
                            :text="t('pages.manage.session.enable')">
                            <template #activator="{ props: tooltipProps }">
                                <v-dialog max-width="400">
                                    <template #activator="{ props: dialogProps }">
                                        <v-btn v-bind="{ ...tooltipProps, ...dialogProps }" size="x-small" @click.stop>
                                            <v-icon size="14">mdi-play</v-icon>
                                        </v-btn>
                                    </template>
                                    <template #default="{ isActive }">
                                        <v-card>
                                            <v-card-text>{{ t('pages.manage.session.areYouSure') }}</v-card-text>
                                            <v-card-actions>
                                                <v-spacer />
                                                <v-btn @click="isActive.value = false">Cancel</v-btn>
                                                <v-btn color="primary" @click="handleEnable(item); isActive.value = false">OK</v-btn>
                                            </v-card-actions>
                                        </v-card>
                                    </template>
                                </v-dialog>
                            </template>
                        </v-tooltip>
                    </template>

                    <!-- Edit Button -->
                    <v-tooltip
                        v-if="item.status !== SessionStatus.PENDING_APPROVAL && item.status !== SessionStatus.QUEUED_FOR_DELETE && item.status !== SessionStatus.TEARDOWN && item.status !== SessionStatus.QUEUED_FOR_SETUP"
                        :text="t('pages.manage.session.edit')">
                        <template #activator="{ props }">
                            <v-btn v-bind="props" size="x-small" @click.stop="handleEdit(item)">
                                <v-icon size="14">mdi-pencil</v-icon>
                            </v-btn>
                        </template>
                    </v-tooltip>

                    <!-- Remove Button -->
                    <v-tooltip :text="t('pages.manage.session.remove')">
                        <template #activator="{ props: tooltipProps }">
                            <v-dialog max-width="400">
                                <template #activator="{ props: dialogProps }">
                                    <v-btn v-bind="{ ...tooltipProps, ...dialogProps }" color="error" size="x-small" @click.stop>
                                        <v-icon size="14">mdi-delete</v-icon>
                                    </v-btn>
                                </template>
                                <template #default="{ isActive }">
                                    <v-card>
                                        <v-card-text>{{ t('pages.manage.session.areYouSure') }}</v-card-text>
                                        <v-card-actions>
                                            <v-spacer />
                                            <v-btn @click="isActive.value = false">Cancel</v-btn>
                                            <v-btn color="primary" @click="handleRemove(item); isActive.value = false">OK</v-btn>
                                        </v-card-actions>
                                    </v-card>
                                </template>
                            </v-dialog>
                        </template>
                    </v-tooltip>
                </div>
            </template>
        </v-data-table>
    </div>
</template>

<style scoped>
.session-table-wrapper {
    position: relative;
    width: 100%;
}
.session-table {
    border-radius: 12px;
    overflow: hidden;
}
.session-table :deep(thead) {
    background-color: rgb(var(--v-theme-surface-variant));
}

.avatar-container {
    display: flex;
    align-items: center;
    justify-content: flex-start;
}

.node {
    margin-left: 15px;
    vertical-align: middle;
}

.small-text {
    font-size: 12px;
}

:deep(tr.clickable) {
    cursor: pointer !important;
}

/* Chip / tag styling */
:deep(.v-chip) {
    border-radius: 4px;
}

.divider-vertical {
    display: inline-block;
    width: 1px;
    height: 12px;
    margin: 0 4px;
    background-color: rgba(255, 255, 255, 0.3);
    vertical-align: middle;
}

/* Action button group styling */
.action-btn-group {
    display: flex;
    align-items: center;
    gap: 2px;
}

.action-btn-group .v-btn {
    min-width: 24px;
    padding: 0 4px;
    height: 24px;
}

.session-table {
    width: 100%;
}

.status-tag {
    margin-right: 0;
    display: inline-flex;
    align-items: center;
    font-size: 10px;
}

:deep(.probe-tag) {
    display: inline-flex;
    align-items: center;
}

:deep(.probe-tag.compact) {
    font-size: 11px;
}

.muted {
    color: rgba(0, 0, 0, 0.45);
}

.session-table.dark .muted {
    color: rgba(255, 255, 255, 0.55);
}

.bgpStatus, .probe-status-compact {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.bgpStatus .v-chip:first-child, .probe-status-compact .v-chip:first-child {
    margin-bottom: 4px;
}

.bgpStatus .v-chip:last-child, .probe-status-compact .v-chip:last-child {
    margin-top: 4px;
}

.ip-stack {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: auto 20px;
}

.ip-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.ip-label {
    font-weight: 600;
    text-transform: uppercase;
    color: rgba(0, 0, 0, 0.45);
    font-size: 10px;
}

.ip-value {
    font-size: 12px;
}

.ip-empty {
    display: flex;
    align-items: center;
    color: rgba(0, 0, 0, 0.25);
}

.session-table.dark .ip-label {
    color: rgba(255, 255, 255, 0.65);
}

.session-table.dark .ip-empty {
    color: rgba(255, 255, 255, 0.35);
}

/* Spinning icon animation */
.spin-icon {
    animation: spin-animation 1s linear infinite;
}

@keyframes spin-animation {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

/* Override Vuetify table cursor for clickable rows */
:deep(.v-data-table tbody tr) {
    cursor: pointer;
}
</style>
