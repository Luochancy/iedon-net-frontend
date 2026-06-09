<!--
*******************************************************************
pages/lg/lgDetail.vue

Copyright (C) 2026 Luochancy

Licensed under the GNU General Public License v3.0.
See LICENSE in the project root.
*******************************************************************
-->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { registerPageTitle, showSnackbar } from '../../common/helper'
import { makeRequest } from '../../common/packetHandler'

const router = useRouter()
const route = useRoute()
const t = useI18n().t

const routerUuid = route.params.routerUuid as string
const protocolName = decodeURIComponent(route.params.protocolName as string)

// State
const loading = ref(true)
const detail = ref<any>(null)
const routerName = ref('')

// Types
interface RichField {
  label: string
  value: string
  color?: string
  mono?: boolean
}

interface RCSCounters {
  received: number
  rejected: number
  filtered: number
  ignored: number
  accepted: number
}

interface RouteChangeStats {
  import_updates?: RCSCounters
  import_withdraws?: RCSCounters
  export_updates?: RCSCounters
  export_withdraws?: RCSCounters
}

interface ChannelDisplay {
  name: string
  state: string
  stateColor: string
  imported: number
  exported: number
  preferred?: number
  table?: string
  preference?: number
  inputFilter?: string
  outputFilter?: string
  importLimit?: number
  bgpNextHop?: string
  routeChangeStats?: RouteChangeStats | null
}

// Fetch protocol detail
const fetchDetail = async () => {
  loading.value = true
  try {
    const resp = await makeRequest(t, `/lg/protocols/${encodeURIComponent(protocolName)}`, undefined, true)
    if (resp.success && resp.response) {
      detail.value = resp.response
    } else {
      showSnackbar(t('pages.lg.loadDetailFailed'), 'error')
    }
  } catch (e) {
    console.error(e)
    showSnackbar(t('pages.lg.loadDetailFailed'), 'error')
  } finally {
    loading.value = false
  }
}

// Fetch router name
const fetchRouterName = async () => {
  try {
    const resp = await makeRequest(t, '/list/routers', undefined, true)
    if (resp.success && resp.response) {
      const data = resp.response as { routers: Array<{ uuid: string; name: string }> }
      const r = data.routers?.find((r: any) => r.uuid === routerUuid)
      if (r) routerName.value = r.name
    }
  } catch (_) { /* ignore */ }
}

// State color
const getStateColor = (state: string): string => {
  const s = state?.toLowerCase() || ''
  if (s === 'up' || s === 'established') return 'success'
  if (s === 'down' || s === 'down') return 'error'
  if (s.includes('start') || s.includes('idle') || s.includes('connect') || s.includes('active')) return 'warning'
  return 'default'
}

// Format BGP-level info
const bgpFields = computed<RichField[]>(() => {
  if (!detail.value) return []
  const d = detail.value
  const bgp = d.bgp
  const fields: RichField[] = []

  // Basic
  if (d.name) fields.push({ label: t('pages.lg.name'), value: d.name, mono: true })
  if (d.proto) fields.push({ label: t('pages.lg.protocol'), value: d.proto })
  if (d.state) fields.push({ label: t('pages.lg.state'), value: d.state, color: getStateColor(d.state) })
  if (d.since) fields.push({ label: t('pages.lg.since'), value: d.since })
  if (d.info) fields.push({ label: t('pages.lg.info'), value: d.info })

  if (!bgp) return fields

  // BGP state
  if (bgp.state) fields.push({ label: 'BGP State', value: bgp.state, color: getStateColor(bgp.state) })

  // Neighbor info
  if (bgp.neighbor_address) fields.push({ label: 'Neighbor', value: bgp.neighbor_address, mono: true })
  if (bgp.neighbor_as) fields.push({ label: 'Neighbor AS', value: `AS${bgp.neighbor_as}` })
  if (bgp.local_as) fields.push({ label: 'Local AS', value: `AS${bgp.local_as}` })
  if (bgp.neighbor_id) fields.push({ label: 'Neighbor ID', value: bgp.neighbor_id })

  // Session type
  if (bgp.session) fields.push({ label: 'Session', value: bgp.session })

  // Source
  if (bgp.source_address) fields.push({ label: 'Source', value: bgp.source_address, mono: true })

  // Timers
  if (bgp.hold_timer) fields.push({ label: 'Hold Timer', value: bgp.hold_timer })
  if (bgp.keepalive_timer) fields.push({ label: 'Keepalive Timer', value: bgp.keepalive_timer })
  if (bgp.connect_delay) fields.push({ label: 'Connect Delay', value: bgp.connect_delay })

  // Error
  if (bgp.last_error) fields.push({ label: 'Last Error', value: bgp.last_error, color: 'error' })

  // Hostname
  if (bgp.hostname) fields.push({ label: 'Hostname', value: bgp.hostname })

  return fields
})

// Channels
const channels = computed<ChannelDisplay[]>(() => {
  if (!detail.value?.channels) return []
  return detail.value.channels.map((ch: any) => ({
    name: ch.name?.toUpperCase() || '',
    state: ch.state || '',
    stateColor: getStateColor(ch.state || ''),
    imported: ch.imported || 0,
    exported: ch.exported || 0,
    preferred: ch.preferred,
    table: ch.table,
    preference: ch.preference,
    inputFilter: ch.input_filter,
    outputFilter: ch.output_filter,
    importLimit: ch.import_limit,
    bgpNextHop: ch.bgp_next_hop,
    routeChangeStats: ch.route_change_stats || null,
  }))
})

const goBack = () => {
  router.push(`/lg`)
}

onMounted(async () => {
  // Check login
  const token = localStorage.getItem('token')
  if (!token) {
    showSnackbar(t('pages.lg.authRequiredWarning'), 'warning')
    router.replace({ path: '/signin' })
    return
  }

  registerPageTitle(`${t('pages.lg.protocolDetail')} - ${protocolName}`)
  await Promise.all([fetchRouterName(), fetchDetail()])
})
</script>

<template>
  <div class="lg-detail-page">
    <div class="page-header">
      <div class="d-flex align-center ga-2 mb-1" style="max-width: 1200px; margin: 0 auto">
        <v-btn variant="text" @click="goBack" prepend-icon="mdi-arrow-left" class="back-btn">
          {{ t('pages.lg.back') }}
        </v-btn>
      </div>
      <h1 class="text-h4 font-weight-bold d-flex align-center justify-center ga-3 mb-1">
        <v-icon size="32" color="primary">mdi-lan</v-icon>
        {{ t('pages.lg.protocolDetail') }}
      </h1>
      <p class="text-body-1 text-medium-emphasis">
        {{ routerName ? `${routerName} / ` : '' }}<code class="font-mono">{{ protocolName }}</code>
      </p>
    </div>

    <v-container style="max-width: 900px">
      <!-- Loading -->
      <div v-if="loading" class="d-flex justify-center align-center pa-12">
        <v-progress-circular indeterminate color="primary" size="40" />
      </div>

      <template v-else-if="detail">
        <!-- BGP Info Card -->
        <v-card rounded="xl" elevation="0" border class="mb-4">
          <v-card-title class="d-flex align-center ga-2 pa-4 pb-0">
            <v-icon color="primary">mdi-information-outline</v-icon>
            <span class="text-body-1 font-weight-medium">BGP {{ t('pages.lg.protocolDetail') }}</span>
          </v-card-title>
          <v-card-text class="pa-4">
            <v-row>
              <v-col v-for="field in bgpFields" :key="field.label" cols="12" sm="6" md="4" class="py-1">
                <div class="text-caption text-medium-emphasis">{{ field.label }}</div>
                <div v-if="field.color">
                  <v-chip :color="field.color" size="small" variant="tonal" class="font-weight-medium mt-1">
                    {{ field.value }}
                  </v-chip>
                </div>
                <div v-else class="text-body-2 mt-1" :class="{ 'font-mono': field.mono }">{{ field.value }}</div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Channel Cards -->
        <v-card v-for="ch in channels" :key="ch.name" rounded="xl" elevation="0" border class="mb-4">
          <v-card-title class="d-flex align-center ga-2 pa-4 pb-0">
            <v-icon :color="ch.state === 'up' ? 'success' : 'error'">
              {{ ch.state === 'up' ? 'mdi-check-circle' : 'mdi-close-circle' }}
            </v-icon>
            <span class="text-body-1 font-weight-medium">Channel {{ ch.name }}</span>
            <v-chip :color="ch.stateColor" size="x-small" variant="tonal" class="font-weight-medium ml-2">
              {{ ch.state }}
            </v-chip>
          </v-card-title>
          <v-card-text class="pa-4">
            <v-row>
              <v-col cols="12" sm="6" md="3" class="py-1">
                <div class="text-caption text-medium-emphasis">Imported</div>
                <div class="text-h6 font-weight-bold mt-1">{{ ch.imported.toLocaleString() }}</div>
              </v-col>
              <v-col cols="12" sm="6" md="3" class="py-1">
                <div class="text-caption text-medium-emphasis">Exported</div>
                <div class="text-h6 font-weight-bold mt-1">{{ ch.exported.toLocaleString() }}</div>
              </v-col>
              <v-col cols="6" sm="3" md="2" class="py-1">
                <div class="text-caption text-medium-emphasis">Preferred</div>
                <div class="text-h6 font-weight-bold mt-1">{{ ch.preferred?.toLocaleString() || '-' }}</div>
              </v-col>
              <v-col cols="6" sm="3" md="2" class="py-1">
                <div class="text-caption text-medium-emphasis">Preference</div>
                <div class="text-body-2 mt-1">{{ ch.preference ?? '-' }}</div>
              </v-col>
              <v-col cols="6" sm="3" md="2" class="py-1">
                <div class="text-caption text-medium-emphasis">Import Limit</div>
                <div class="text-body-2 mt-1">{{ ch.importLimit?.toLocaleString() || '-' }}</div>
              </v-col>
              <!-- Detail row -->
              <v-col cols="12" class="py-1 mt-2">
                <v-divider class="mb-2" />
                <v-row>
                  <v-col cols="12" sm="6" class="py-1">
                    <div class="text-caption text-medium-emphasis">Table</div>
                    <div class="text-body-2 font-mono mt-1">{{ ch.table || '-' }}</div>
                  </v-col>
                  <v-col cols="12" sm="6" class="py-1">
                    <div class="text-caption text-medium-emphasis">Input Filter</div>
                    <div class="text-body-2 font-mono mt-1">{{ ch.inputFilter || '-' }}</div>
                  </v-col>
                  <v-col cols="12" sm="6" class="py-1">
                    <div class="text-caption text-medium-emphasis">Output Filter</div>
                    <div class="text-body-2 font-mono mt-1">{{ ch.outputFilter || '-' }}</div>
                  </v-col>
                </v-row>
              </v-col>
              <!-- BGP Next Hop -->
              <v-col v-if="ch.bgpNextHop" cols="12" class="py-1">
                <v-divider class="mb-2" />
                <div class="text-caption text-medium-emphasis">BGP Next Hop</div>
                <div class="text-body-2 font-mono mt-1">{{ ch.bgpNextHop }}</div>
              </v-col>
              <!-- Route Change Stats -->
              <v-col v-if="ch.routeChangeStats" cols="12" class="py-1">
                <v-divider class="mb-2" />
                <div class="text-caption text-medium-emphasis mb-2">Route Change Stats</div>
                <div class="rcs-table font-mono">
                  <div class="rcs-row rcs-header">
                    <span class="rcs-cell rcs-label"></span>
                    <span class="rcs-cell">Received</span>
                    <span class="rcs-cell">Rejected</span>
                    <span class="rcs-cell">Filtered</span>
                    <span class="rcs-cell">Ignored</span>
                    <span class="rcs-cell">Accepted</span>
                  </div>
                  <div v-for="dir in ['Import', 'Export']" :key="dir">
                    <template v-for="act in ['updates', 'withdraws']" :key="`${dir}-${act}`">
                      <div
                        v-if="ch.routeChangeStats?.[`${dir.toLowerCase()}_${act}` as keyof RouteChangeStats]"
                        class="rcs-row"
                      >
                        <span class="rcs-cell rcs-label">{{ dir }} {{ act }}</span>
                        <span v-for="col in ['received','rejected','filtered','ignored','accepted']" :key="col" class="rcs-cell">
                          {{ (ch.routeChangeStats![`${dir.toLowerCase()}_${act}` as keyof RouteChangeStats] as any)?.[col] ?? '-' }}
                        </span>
                      </div>
                    </template>
                  </div>
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Raw Data -->
        <v-card rounded="xl" elevation="0" border>
          <v-card-title class="d-flex align-center ga-2 pa-4 pb-0">
            <v-icon color="primary">mdi-code-json</v-icon>
            <span class="text-body-1 font-weight-medium">{{ t('pages.lg.rawData') }}</span>
          </v-card-title>
          <v-card-text class="pa-4">
            <pre class="detail-pre">{{ JSON.stringify(detail, null, 2) }}</pre>
          </v-card-text>
        </v-card>
      </template>

      <!-- No data -->
      <div v-else class="text-center pa-12 text-medium-emphasis">
        <v-icon size="64" class="mb-4">mdi-lan-disconnect</v-icon>
        <p class="text-h6">{{ t('pages.lg.noDetail') }}</p>
      </div>
    </v-container>
  </div>
</template>

<style scoped>
.lg-detail-page {
  min-height: 100vh;
}

.page-header {
  text-align: center;
  padding: 1rem 1rem 0.5rem;
}

.back-btn {
  align-self: flex-start;
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

.font-mono {
  font-family: 'Roboto Mono', 'SF Mono', 'Fira Code', monospace;
  font-size: 0.9em;
}

.rcs-table {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-x: auto;
}

.rcs-row {
  display: grid;
  grid-template-columns: 1.2fr repeat(5, 1fr);
  gap: 4px;
  padding: 6px 8px;
  border-radius: 6px;
}

.rcs-header {
  background: rgb(var(--v-theme-surface-container-low, 240, 240, 240));
  font-weight: 600;
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface-variant));
}

.rcs-cell {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  line-height: 1.4;
}

.rcs-label {
  font-weight: 500;
}
</style>
