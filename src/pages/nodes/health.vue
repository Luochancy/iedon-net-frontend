<!--
*******************************************************************
pages/nodes/health.vue — Service Health Dashboard

Copyright (C) 2024 iEdon
Copyright (C) 2026 Luochancy

This file is part of a project derived from iedon-net-frontend.
Modified by Luochancy on 2026-06.

Licensed under the GNU General Public License v3.0.
See the LICENSE file in the project root for details.
*******************************************************************
-->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { makeRequest, RouterMetadata, RoutersResponse } from '../../common/packetHandler'
import { loggedIn, isAdmin, registerPageTitle, showSnackbar, formatBytes } from '../../common/helper'
import RouterLocationAvatar from '../../components/RouterLocationAvatar.vue'

const t = useI18n().t
const router = useRouter()
const route = useRoute()

// ============================================================
// State
// ============================================================
const loading = ref(true)
const routers = ref<RouterMetadata[]>([])
const expandedUuid = ref<string | null>(null)
const statusFilter = ref<'all' | 'online' | 'offline'>('all')
const highlightNodeUuid = ref<string | null>(null)

// ============================================================
// Region mapping (same as nodes.vue)
// ============================================================
const REGION_MAPPING = new Map([
  ['AD', 'Europe'], ['AL', 'Europe'], ['AT', 'Europe'], ['BA', 'Europe'], ['BE', 'Europe'], ['BG', 'Europe'],
  ['BY', 'Europe'], ['CH', 'Europe'], ['CZ', 'Europe'], ['DE', 'Europe'], ['DK', 'Europe'], ['EE', 'Europe'],
  ['ES', 'Europe'], ['FI', 'Europe'], ['FR', 'Europe'], ['GB', 'Europe'], ['GR', 'Europe'], ['HR', 'Europe'],
  ['HU', 'Europe'], ['IE', 'Europe'], ['IS', 'Europe'], ['IT', 'Europe'], ['LI', 'Europe'], ['LT', 'Europe'],
  ['LU', 'Europe'], ['LV', 'Europe'], ['MC', 'Europe'], ['MD', 'Europe'], ['ME', 'Europe'], ['MK', 'Europe'],
  ['MT', 'Europe'], ['NL', 'Europe'], ['NO', 'Europe'], ['PL', 'Europe'], ['PT', 'Europe'], ['RO', 'Europe'],
  ['RS', 'Europe'], ['SE', 'Europe'], ['SI', 'Europe'], ['SK', 'Europe'], ['SM', 'Europe'], ['UA', 'Europe'],
  ['VA', 'Europe'], ['XK', 'Europe'],
  ['US', 'North America'], ['CA', 'North America'], ['MX', 'North America'], ['GT', 'North America'],
  ['BZ', 'North America'], ['SV', 'North America'], ['HN', 'North America'], ['NI', 'North America'],
  ['CR', 'North America'], ['PA', 'North America'],
  ['AR', 'South America'], ['BO', 'South America'], ['BR', 'South America'], ['CL', 'South America'],
  ['CO', 'South America'], ['EC', 'South America'], ['FK', 'South America'], ['GF', 'South America'],
  ['GY', 'South America'], ['PE', 'South America'], ['PY', 'South America'], ['SR', 'South America'],
  ['UY', 'South America'], ['VE', 'South America'],
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
  ['IN', 'Asia-S'], ['PK', 'Asia-S'], ['BD', 'Asia-S'], ['LK', 'Asia-S'], ['NP', 'Asia-S'], ['BT', 'Asia-S'], ['MV', 'Asia-S'],
  ['TH', 'Asia-SE'], ['SG', 'Asia-SE'], ['PH', 'Asia-SE'], ['ID', 'Asia-SE'], ['MY', 'Asia-SE'],
  ['VN', 'Asia-SE'], ['KH', 'Asia-SE'], ['LA', 'Asia-SE'], ['MM', 'Asia-SE'], ['BN', 'Asia-SE'], ['TL', 'Asia-SE'],
  ['JP', 'Asia-E'], ['CN', 'Asia-E'], ['KR', 'Asia-E'], ['TW', 'Asia-E'], ['HK', 'Asia-E'], ['MO', 'Asia-E'],
  ['KP', 'Asia-E'], ['MN', 'Asia-E'],
  ['AU', 'Pacific&Oceania'], ['NZ', 'Pacific&Oceania'], ['FJ', 'Pacific&Oceania'], ['PG', 'Pacific&Oceania'],
  ['NC', 'Pacific&Oceania'], ['SB', 'Pacific&Oceania'], ['VU', 'Pacific&Oceania'], ['WS', 'Pacific&Oceania'],
  ['KI', 'Pacific&Oceania'], ['NR', 'Pacific&Oceania'], ['PW', 'Pacific&Oceania'], ['FM', 'Pacific&Oceania'],
  ['MH', 'Pacific&Oceania'], ['TO', 'Pacific&Oceania'], ['TV', 'Pacific&Oceania'], ['CK', 'Pacific&Oceania'],
  ['NU', 'Pacific&Oceania'], ['TK', 'Pacific&Oceania'], ['WF', 'Pacific&Oceania'], ['AS', 'Pacific&Oceania'],
  ['GU', 'Pacific&Oceania'], ['MP', 'Pacific&Oceania'], ['UM', 'Pacific&Oceania'], ['PF', 'Pacific&Oceania'],
  ['AQ', 'Antarctica'],
  ['RU', 'Asia-N'],
  ['IR', 'Asia-W'], ['TR', 'Asia-W'], ['AE', 'Asia-W'], ['SA', 'Asia-W'], ['IQ', 'Asia-W'], ['SY', 'Asia-W'],
  ['LB', 'Asia-W'], ['JO', 'Asia-W'], ['IL', 'Asia-W'], ['PS', 'Asia-W'], ['KW', 'Asia-W'], ['QA', 'Asia-W'],
  ['BH', 'Asia-W'], ['OM', 'Asia-W'], ['YE', 'Asia-W'], ['GE', 'Asia-W'], ['AM', 'Asia-W'], ['AZ', 'Asia-W'],
  ['CY', 'Asia-W'],
  ['AF', 'Central Asia'], ['UZ', 'Central Asia'], ['KZ', 'Central Asia'], ['KG', 'Central Asia'],
  ['TJ', 'Central Asia'], ['TM', 'Central Asia']
])

const getRegionLabel = (location?: string): string => {
  if (!location) return t('pages.nodes.regions.Other Region')
  const key = REGION_MAPPING.get(location.toUpperCase()) ?? 'Other Region'
  const translated = t(`pages.nodes.regions.${key}`)
  return translated !== `pages.nodes.regions.${key}` ? translated : key
}

// ============================================================
// Helpers
// ============================================================
const isOffline = (r: RouterMetadata): boolean => {
  if (!r.metric?.timestamp) return true
  return r.metric.timestamp / 1000 < Date.now() / 1000 - 15 * 60
}

const formatUptime = (s: number): string => {
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  return `${d}d ${h}h`
}

const formatHeartbeat = (ts: number): string => {
  const delta = Math.floor(Date.now() / 1000 - ts / 1000)
  if (delta < 60) return `${delta} ${t('pages.health.timeAgo.seconds')}`
  if (delta < 3600) return `${Math.floor(delta / 60)} ${t('pages.health.timeAgo.minutes')}`
  if (delta < 86400) return `${Math.floor(delta / 3600)} ${t('pages.health.timeAgo.hours')}`
  return `${Math.floor(delta / 86400)} ${t('pages.health.timeAgo.days')}`
}

const parseLoadAvg = (avg?: string): string[] => {
  if (!avg) return ['-', '-', '-']
  const parts = avg.trim().split(/\s+/)
  return [parts[0] || '-', parts[1] || '-', parts[2] || '-']
}

const getBirdInfo = (rs?: string): string => {
  if (!rs) return t('pages.health.na')
  const lines = rs.split('\n')
  for (const l of lines) if (l.includes('BIRD')) return l.trim()
  return lines[0]?.trim() || t('pages.health.na')
}

const getAgentVer = (v?: string): string => {
  if (!v) return t('pages.health.na')
  const m = v.match(/\/([0-9.]+)/)
  return m ? m[1] : t('pages.health.na')
}

// ============================================================
// Load avg color / progress helpers
// ============================================================
const loadAvgColor = (val: string): string => {
  const n = parseFloat(val)
  if (isNaN(n)) return 'medium-emphasis'
  if (n >= 4) return 'error'
  if (n >= 1) return 'warning'
  return 'success'
}

// ============================================================
// Data
// ============================================================
const fetchRouters = async () => {
  loading.value = true
  try {
    const resp = await makeRequest(t, '/list/routers')
    if (resp.success && resp.response) {
      const data = resp.response as RoutersResponse
      if (data?.routers) {
        routers.value = data.routers.sort((a, b) => ('' + a.name).localeCompare(b.name))
      }
    }
  } catch (e) {
    console.error(e)
    showSnackbar(t('pages.health.loadFailed'), 'error')
  } finally {
    loading.value = false
  }
}

// ============================================================
// Summary
// ============================================================
const totalNodes = computed(() => routers.value.length)
const onlineCount = computed(() => routers.value.filter(r => !isOffline(r)).length)
const offlineCount = computed(() => totalNodes.value - onlineCount.value)

const filteredRouters = computed(() => {
  let result = routers.value
  if (statusFilter.value === 'online') {
    result = result.filter(r => !isOffline(r))
  } else if (statusFilter.value === 'offline') {
    result = result.filter(r => isOffline(r))
  }
  if (highlightNodeUuid.value) {
    result = result.filter(r => r.uuid === highlightNodeUuid.value)
  }
  return result
})

const clearNodeHighlight = () => {
  highlightNodeUuid.value = null
  router.replace({ path: '/health' })
}

// ============================================================
// Auth-gated expand
// ============================================================
const handleCardClick = (uuid: string) => {
  if (!loggedIn.value) {
    showSnackbar(t('pages.health.signInToView'), 'info')
    return
  }
  if (!isAdmin.value) {
    showSnackbar(t('pages.health.adminRequired'), 'warning')
    return
  }
  expandedUuid.value = expandedUuid.value === uuid ? null : uuid
}

onMounted(() => {
  registerPageTitle(t('pages.health.pageTitle'))
  highlightNodeUuid.value = (route.query.node as string) || null
  fetchRouters()
})
</script>

<template>
  <div class="health-page">
    <!-- Header -->
    <div class="page-header">
      <h1 class="text-h4 font-weight-bold d-flex align-center justify-center ga-3 mb-1">
        <v-icon size="32" color="primary">mdi-heart-pulse</v-icon>
        {{ t('pages.health.title') }}
      </h1>
      <p class="text-body-1 text-medium-emphasis">{{ t('pages.health.subtitle') }}</p>
    </div>

    <!-- Status filter bar -->
    <div class="d-flex justify-center mb-4" v-if="!loading">
      <div class="status-filter-bar">
        <v-btn size="small" rounded="pill"
          :color="statusFilter === 'all' ? 'primary' : 'default'"
          :variant="statusFilter === 'all' ? 'flat' : 'outlined'"
          @click="statusFilter = 'all'">
          {{ t('pages.health.all') }} ({{ totalNodes }})
        </v-btn>
        <v-btn size="small" rounded="pill"
          :color="statusFilter === 'online' ? 'success' : 'default'"
          :variant="statusFilter === 'online' ? 'flat' : 'outlined'"
          @click="statusFilter = 'online'">
          {{ t('pages.health.online') }} ({{ onlineCount }})
        </v-btn>
        <v-btn size="small" rounded="pill"
          :color="statusFilter === 'offline' ? 'error' : 'default'"
          :variant="statusFilter === 'offline' ? 'flat' : 'outlined'"
          @click="statusFilter = 'offline'">
          {{ t('pages.health.offline') }} ({{ offlineCount }})
        </v-btn>
      </div>
    </div>

    <!-- Highlight clear hint -->
    <div v-if="highlightNodeUuid" class="d-flex justify-center align-center ga-2 mb-4">
      <v-chip size="small" variant="tonal" color="primary" closable @click:close="clearNodeHighlight()">
        {{ t('pages.health.viewingSpecificNode') }}
      </v-chip>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="d-flex justify-center align-center py-16">
      <v-progress-circular indeterminate color="primary" size="48" width="4" />
    </div>

    <!-- Empty -->
    <div v-else-if="filteredRouters.length === 0" class="empty-state">
      <v-icon size="64" class="mb-4" :color="statusFilter !== 'all' ? 'warning' : 'medium-emphasis'">
        {{ statusFilter !== 'all' ? 'mdi-filter-remove' : 'mdi-lan-disconnect' }}
      </v-icon>
      <p class="text-h6 text-medium-emphasis">
        {{ statusFilter === 'online' ? t('pages.health.noOnlineNodes') : statusFilter === 'offline' ? t('pages.health.noOfflineNodes') : t('pages.health.noNodesAvailable') }}
      </p>
    </div>

    <!-- Card grid with transition -->
    <TransitionGroup v-else name="card-list" tag="div" class="health-grid">
      <div
        v-for="r in filteredRouters"
        :key="r.uuid"
        class="health-card"
        :class="{ 'card-offline': isOffline(r) }"
      >
        <!-- Card Header -->
        <div class="card-header" @click="handleCardClick(r.uuid)">
          <div class="node-info">
            <RouterLocationAvatar
              :router="r"
              :color="isOffline(r) ? 'red' : undefined"
              class="node-avatar"
            />
            <div class="node-title">
              <h3 class="node-name">{{ r.name }}</h3>
              <div class="status-indicator" :class="isOffline(r) ? 'error' : 'success'">
                <v-icon size="10" class="status-dot">{{ isOffline(r) ? 'mdi-alert-circle' : 'mdi-check-circle' }}</v-icon>
                <span class="status-text">{{ isOffline(r) ? t('pages.health.statusOffline') : t('pages.health.statusOnline') }}</span>
                <span class="status-sep">·</span>
                <span class="status-uptime">{{ r.metric ? formatUptime(r.metric.uptime) : '-' }}</span>
              </div>
            </div>
          </div>
          <v-chip size="x-small" variant="flat" color="surface-variant" rounded="pill">
            {{ getRegionLabel(r.location) }}
          </v-chip>
        </div>

        <v-divider class="section-divider" />

        <!-- Heartbeat -->
        <div class="heartbeat-row" @click="handleCardClick(r.uuid)">
          <v-icon size="14" color="medium-emphasis" class="hb-icon">mdi-pulse</v-icon>
          <span class="text-body-2 text-medium-emphasis">{{ t('pages.health.heartbeat') }}</span>
          <v-spacer />
          <span
            class="heartbeat-value"
            :class="isOffline(r) ? 'text-error' : r.metric ? 'text-medium-emphasis' : 'text-error'"
          >
            {{ r.metric ? formatHeartbeat(r.metric.timestamp) : '-' }}
          </span>
        </div>

        <v-divider class="section-divider" />

        <!-- Load Section -->
        <div class="load-section" @click="handleCardClick(r.uuid)">
          <span class="section-label">{{ t('pages.health.load') }}</span>
          <template v-for="(val, idx) in parseLoadAvg(r.metric?.loadAvg)" :key="idx">
            <span class="load-val" :class="`text-${loadAvgColor(val)}`">{{ val }}</span>
            <span v-if="idx < 2" class="load-sep">/</span>
          </template>
        </div>

        <v-divider class="section-divider" />

        <!-- Network Section -->
        <div class="net-section" @click="handleCardClick(r.uuid)">
          <span class="section-label">{{ t('pages.health.network') }}</span>
          <span class="net-dir">
            <v-icon size="14" color="primary">mdi-arrow-up</v-icon>
            <span class="net-val font-mono">{{ r.metric ? formatBytes(r.metric.tx) : '-' }}</span>
          </span>
          <span class="net-dir">
            <v-icon size="14" color="secondary">mdi-arrow-down</v-icon>
            <span class="net-val font-mono">{{ r.metric ? formatBytes(r.metric.rx) : '-' }}</span>
          </span>
        </div>

        <!-- Diagnostics toggle -->
        <div class="diagnostics-toggle" @click="handleCardClick(r.uuid)">
          <span class="diag-toggle-text">
            {{ expandedUuid === r.uuid ? t('pages.health.hideDiagnostics') : t('pages.health.diagnostics') }}
          </span>
          <v-icon
            size="14"
            class="diag-toggle-icon"
            :class="{ expanded: expandedUuid === r.uuid }"
          >mdi-chevron-down</v-icon>
        </div>

        <!-- Expanded Diagnostics Panel -->
        <div v-if="expandedUuid === r.uuid && r.metric" class="diagnostics-panel">
          <div class="diag-grid">
            <div class="diag-item">
              <div class="diag-label">{{ t('pages.health.kernel') }}</div>
              <div class="diag-value font-mono">{{ r.metric.kernel }}</div>
            </div>
            <div class="diag-item">
              <div class="diag-label">{{ t('pages.health.bird') }}</div>
              <div class="diag-value font-mono">{{ getBirdInfo(r.metric.rs) }}</div>
            </div>
            <div class="diag-item">
              <div class="diag-label">{{ t('pages.health.agent') }}</div>
              <div class="diag-value font-mono">{{ getAgentVer(r.metric.version) }}</div>
            </div>
            <div class="diag-item">
              <div class="diag-label">{{ t('pages.health.tcpUdp') }}</div>
              <div class="diag-value font-mono">{{ r.metric.tcp }} / {{ r.metric.udp }}</div>
            </div>
            <div class="diag-item diag-full">
              <div class="diag-label">{{ t('pages.health.version') }}</div>
              <div class="diag-value font-mono">{{ r.metric.version }}</div>
            </div>
          </div>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
/* ============================================================
   Page Layout
   ============================================================ */
.health-page {
  margin: 0 auto;
  padding: 24px;
  max-width: 1200px;
}

.page-header {
  text-align: center;
  margin: 16px auto 32px;
}

/* ============================================================
   Card Grid
   ============================================================ */
.status-filter-bar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.status-filter-bar :deep(.v-btn) {
  transition: all 0.3s ease;
}

.health-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
  align-items: stretch;
}

/* Card grid — MD3 list transitions (no scale, standard easing) */
.card-list-enter-active {
  transition: all 0.3s cubic-bezier(0.0, 0.0, 0.2, 1.0);
}

.card-list-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0.0, 1.0, 1.0);
  position: absolute;
}

.card-list-enter-from {
  opacity: 0;
  transform: translateY(40px);
}

.card-list-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}

.card-list-move {
  transition: transform 0.3s cubic-bezier(0.0, 0.0, 0.2, 1.0);
}

/* ============================================================
   Card
   ============================================================ */
.health-card {
  border: 1px solid rgba(var(--v-border-color), 0.12);
  border-radius: 16px;
  padding: 20px;
  transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
  position: relative;
}

.health-card:hover {
  border-color: rgb(var(--v-theme-primary));
  transform: translateY(-2px);
}

.card-offline {
  opacity: 0.72;
  background: rgba(var(--v-theme-error), 0.03);
}

.card-offline:hover {
  border-color: rgb(var(--v-theme-error));
}

/* ============================================================
   Card Header
   ============================================================ */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  cursor: pointer;
  margin-bottom: 4px;
}

.node-info {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  flex: 1;
  min-width: 0;
}

.node-avatar {
  flex-shrink: 0;
}

.node-title {
  flex: 1;
  min-width: 0;
}

.node-name {
  margin: 0 0 6px 0;
  font-size: 17px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  line-height: 1.3;
  word-break: break-word;
}

/* ============================================================
   Status Indicator
   ============================================================ */
.status-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-indicator.success { color: rgb(var(--v-theme-success)); }
.status-indicator.error   { color: rgb(var(--v-theme-error)); }

.status-dot {
  font-size: 10px;
}

.status-text {
  font-weight: 600;
}

.status-sep {
  opacity: 0.4;
  margin: 0 2px;
}

.status-uptime {
  color: rgb(var(--v-theme-on-surface-variant));
  font-weight: 400;
}

/* ============================================================
   Section Divider
   ============================================================ */
.section-divider {
  margin: 14px 0;
  opacity: 0.6;
}

/* ============================================================
   Heartbeat Row
   ============================================================ */
.heartbeat-row {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.hb-icon {
  flex-shrink: 0;
}

.heartbeat-value {
  font-size: 13px;
  font-weight: 500;
  font-family: 'Roboto Mono', 'SF Mono', 'Fira Code', monospace;
}

/* ============================================================
   Section Label
   ============================================================ */
.section-label {
  font-size: 11px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface-variant));
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 10px;
}

/* ============================================================
   Load Section — inline color-coded numbers
   ============================================================ */
.load-section {
  display: flex;
  align-items: baseline;
  gap: 6px;
  cursor: pointer;
}

.load-section .section-label {
  margin-bottom: 0;
}

.load-val {
  font-size: 14px;
  font-weight: 600;
  font-family: 'Roboto Mono', 'SF Mono', 'Fira Code', monospace;
}

.load-val.text-success            { color: rgb(var(--v-theme-success)); }
.load-val.text-warning            { color: rgb(var(--v-theme-warning)); }
.load-val.text-error              { color: rgb(var(--v-theme-error)); }
.load-val.text-medium-emphasis    { color: rgb(var(--v-theme-on-surface-variant)); }

.load-sep {
  color: rgb(var(--v-theme-on-surface-variant));
  opacity: 0.35;
  font-weight: 300;
}

/* ============================================================
   Network Section — inline icons + numbers
   ============================================================ */
.net-section {
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
}

.net-section .section-label {
  margin-bottom: 0;
}

.net-dir {
  display: flex;
  align-items: center;
  gap: 4px;
}

.net-val {
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

/* ============================================================
   Diagnostics Toggle
   ============================================================ */
.diagnostics-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  margin-top: 14px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
  user-select: none;
}

.diagnostics-toggle:hover {
  background: rgba(var(--v-theme-primary), 0.08);
}

.diag-toggle-text {
  font-size: 12px;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface-variant));
}

.diag-toggle-icon {
  font-size: 14px;
  color: rgb(var(--v-theme-on-surface-variant));
  transition: transform 0.25s ease;
}

.diag-toggle-icon.expanded {
  transform: rotate(180deg);
}

/* ============================================================
   Diagnostics Panel
   ============================================================ */
.diagnostics-panel {
  margin-top: 12px;
  padding: 14px;
  border-radius: 12px;
  background: rgba(var(--v-theme-surface-variant), 0.35);
  animation: panelSlideIn 0.25s ease-out;
}

@keyframes panelSlideIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.diag-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.diag-item {
  min-width: 0;
}

.diag-item.diag-full {
  grid-column: 1 / -1;
}

.diag-label {
  font-size: 10px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface-variant));
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 3px;
}

.diag-value {
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface));
  word-break: break-all;
}

/* ============================================================
   Utils
   ============================================================ */
.font-mono {
  font-family: 'Roboto Mono', 'SF Mono', 'Fira Code', monospace;
  font-size: 0.82em;
}

.empty-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  margin: 60px 0;
}

/* ============================================================
   Responsive
   ============================================================ */
@media (max-width: 768px) {
  .health-page {
    padding: 12px 16px;
  }

  .health-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .health-card {
    padding: 16px;
  }
}

@media (max-width: 480px) {
  .health-page {
    padding: 8px 12px;
  }

  .node-info {
    flex-direction: column;
    gap: 8px;
  }

  .diag-grid {
    grid-template-columns: 1fr;
  }
}
</style>
