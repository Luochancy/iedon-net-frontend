<template>
    <div>
        <div id="metrics" v-if="sessionMetrics && routerInfo && !loading">
            <!-- Header Actions -->
            <div class="header-actions">
                <v-btn @click="goBack" variant="text" size="large" class="back-button" prepend-icon="mdi-arrow-left">
                    {{ t('pages.metrics.back') }}
                </v-btn>

                <!-- Session Management Actions -->
                <template v-if="sessionMetadata">
                    <div class="d-flex ga-2">
                        <!-- Enable/Disable Button -->
                        <v-dialog max-width="400"
                            v-if="sessionMetadata.status === SessionStatus.ENABLED || sessionMetadata.status === SessionStatus.PROBLEM">
                            <template #activator="{ props: activatorProps }">
                                <v-btn size="large" v-bind="activatorProps" prepend-icon="mdi-pause">
                                    {{ t('pages.manage.session.disable') }}
                                </v-btn>
                            </template>
                            <template #default="{ isActive }">
                                <v-card>
                                    <v-card-title>{{ t('pages.manage.session.areYouSure') }}</v-card-title>
                                    <v-card-actions>
                                        <v-spacer></v-spacer>
                                        <v-btn @click="isActive.value = false">Cancel</v-btn>
                                        <v-btn color="primary" @click="handleDisable(); isActive.value = false">OK</v-btn>
                                    </v-card-actions>
                                </v-card>
                            </template>
                        </v-dialog>

                        <v-dialog max-width="400"
                            v-else-if="sessionMetadata.status === SessionStatus.DISABLED || sessionMetadata.status === SessionStatus.TEARDOWN">
                            <template #activator="{ props: activatorProps }">
                                <v-btn size="large" v-bind="activatorProps" prepend-icon="mdi-play">
                                    {{ t('pages.manage.session.enable') }}
                                </v-btn>
                            </template>
                            <template #default="{ isActive }">
                                <v-card>
                                    <v-card-title>{{ t('pages.manage.session.areYouSure') }}</v-card-title>
                                    <v-card-actions>
                                        <v-spacer></v-spacer>
                                        <v-btn @click="isActive.value = false">Cancel</v-btn>
                                        <v-btn color="primary" @click="handleEnable(); isActive.value = false">OK</v-btn>
                                    </v-card-actions>
                                </v-card>
                            </template>
                        </v-dialog>

                        <!-- Edit Button -->
                        <v-btn size="large" @click="handleEdit" prepend-icon="mdi-pencil"
                            v-if="sessionMetadata.status !== SessionStatus.PENDING_APPROVAL && sessionMetadata.status !== SessionStatus.QUEUED_FOR_DELETE && sessionMetadata.status !== SessionStatus.TEARDOWN && sessionMetadata.status !== SessionStatus.QUEUED_FOR_SETUP">
                            {{ t('pages.manage.session.edit') }}
                        </v-btn>

                        <!-- Delete Button -->
                        <v-dialog max-width="400">
                            <template #activator="{ props: activatorProps }">
                                <v-btn size="large" v-bind="activatorProps" color="error" prepend-icon="mdi-delete">
                                    {{ t('pages.manage.session.remove') }}
                                </v-btn>
                            </template>
                            <template #default="{ isActive }">
                                <v-card>
                                    <v-card-title>{{ t('pages.manage.session.areYouSure') }}</v-card-title>
                                    <v-card-actions>
                                        <v-spacer></v-spacer>
                                        <v-btn @click="isActive.value = false">Cancel</v-btn>
                                        <v-btn color="primary" @click="handleRemove(); isActive.value = false">OK</v-btn>
                                    </v-card-actions>
                                </v-card>
                            </template>
                        </v-dialog>
                    </div>
                </template>

                <v-btn @click="refreshData" color="primary" size="large" prepend-icon="mdi-refresh">
                    {{ t('pages.metrics.refresh') }}
                </v-btn>
            </div>

            <!-- Session Information -->
            <div class="session-header">
                <div class="session-header-main">
                    <router-location-avatar :router="routerInfo" :hide-peering-dot="true" />
                    <div class="session-info">
                        <h1 class="session-title">
                            {{ routerInfo.name }}
                            <v-chip v-if="sessionMetadata" :color="getStatusColor(sessionMetadata.status)"
                                size="small" class="session-status-badge">
                                {{ t(`pages.manage.session.statusCode['${sessionMetadata.status}']`) }}
                            </v-chip>
                        </h1>
                        <div class="session-subtitle" v-if="routerInfo.description"
                            v-html="md.render(routerInfo.description)">
                        </div>
                    </div>
                </div>

                <!-- Session Details Cards -->
                <div class="session-details-grid" v-if="sessionMetadata">
                    <!-- Session Info Card -->
                    <div class="session-detail-card">
                        <div class="detail-card-header">
                            <div class="detail-card-icon session-icon">
                                <v-icon>mdi-lan-connect</v-icon>
                            </div>
                            <div class="detail-card-title">{{ t('pages.metrics.sessionDetails') }}</div>
                            <span v-if="countdownSeconds > 0" class="next-update-countdown">
                                <span class="countdown-indicator"></span>
                                {{ t('pages.metrics.nextUpdate') }}: {{ countdownDisplay }}
                            </span>
                        </div>
                        <v-alert
                            v-if="sessionMetadata?.lastError"
                            type="error"
                            prominent
                            class="detail-card-alert"
                            :title="t('pages.metrics.lastError')"
                            :text="sessionMetadata.lastError"
                        ></v-alert>
                        <div class="detail-card-content">
                            <div class="detail-item detail-item-full-width">
                                <span class="detail-label">{{ t('pages.metrics.sessionId') }}</span>
                                <span class="detail-value copyable" @click="copySessionId"
                                    :title="t('pages.metrics.clickToCopy')">{{ sessionId }}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">ASN</span>
                                <span class="detail-value">
                                    <span>{{ sessionMetadata.asn }}</span>
                                </span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">{{ t('pages.metrics.interaceType') }}</span>
                                <span class="detail-value">
                                    <span>{{ t(`pages.peering.${sessionMetadata.type}`) }}</span>
                                </span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">{{ t('pages.metrics.interfaceName') }}</span>
                                <span class="detail-value copyable"
                                    @click="copyToClipboard(sessionMetadata?.interface || '', 'Interface Name')">
                                    <span>{{ sessionMetadata.interface || t('pages.metrics.notAvailable')}}</span>
                                </span>
                            </div>
                            <div class="detail-item" v-if="sessionMetadata?.mtu || !sessionMetadata">
                                <span class="detail-label">{{ t('pages.metrics.mtu') }}</span>
                                <span class="detail-value">
                                    <span>{{ sessionMetadata.mtu || t('pages.metrics.notAvailable') }}</span>
                                </span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">{{ t('pages.metrics.routingPolicy') }}</span>
                                <span class="detail-value">
                                    <span>{{ getRoutingPolicyName(sessionMetadata.policy) }}</span>
                                </span>
                            </div>
                            <div class="detail-item" v-if="sessionMetadata?.extensions || !sessionMetadata">
                                <span class="detail-label">{{ t('pages.metrics.bgpExtensions') }}</span>
                                <span class="detail-value">{{ formatBgpExtensions(sessionMetadata?.extensions || [])
                                    }}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">{{ t('pages.metrics.createdAt') }}</span>
                                <span class="detail-value"
                                    :title="sessionMetadata ? formatDate(sessionMetadata.createdAt) : ''">
                                    <span>{{ sessionMetadata ? formatRelativeTime(sessionMetadata.createdAt, t) :
                                        t('pages.metrics.loading') }}</span>
                                </span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">{{ t('pages.metrics.updatedAt') }}</span>
                                <span class="detail-value"
                                    :title="sessionMetadata ? formatDate(sessionMetadata.updatedAt) : ''">
                                    <span>{{ sessionMetadata ? formatRelativeTime(sessionMetadata.updatedAt, t) :
                                        t('pages.metrics.loading') }}</span>
                                </span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">{{ t('pages.metrics.lastUpdated') }}</span>
                                <span class="detail-value"
                                    :title="sessionMetrics ? formatDate(new Date(sessionMetrics.timestamp * 1000 || +new Date()).toISOString()) : ''">
                                    {{ sessionMetrics ? formatRelativeTime(new Date(sessionMetrics.timestamp * 1000 ||
                                        +new
                                            Date()).toISOString(), t) : t('pages.metrics.loading') }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Network Info Card -->
                    <div class="session-detail-card">
                        <div class="detail-card-header">
                            <div class="detail-card-icon network-icon">
                                <v-icon>mdi-earth</v-icon>
                            </div>
                            <div class="detail-card-title">{{ t('pages.metrics.networkInfo') }}</div>
                            <div class="probe-status-inline" v-if="probeStatusDisplay.length">
                                <v-tooltip
                                    v-for="status in probeStatusDisplay"
                                    :key="`probe-inline-${status.version}`"
                                    :text="status.description"
                                >
                                    <template #activator="{ props: tooltipProps }">
                                        <v-chip v-bind="tooltipProps" size="small" variant="outlined" class="probe-inline-tag">
                                            <span class="probe-dot" :style="{ backgroundColor: status.color }"></span>
                                            <span class="probe-pill-label">
                                                {{ status.version === 'ipv4' ? 'V4' : 'V6' }} {{ status.label }}
                                            </span>
                                        </v-chip>
                                    </template>
                                </v-tooltip>
                            </div>
                        </div>
                        <div class="detail-card-content">
                            <div class="detail-item" v-if="routerInfo?.ipv4 || sessionMetadata?.ipv4"
                                :class="{ 'detail-item-full-width': typeof ipv4Display === 'object' && ipv4Display.isPair }">
                                <span class="detail-label">{{ t('pages.metrics.ipv4Address') }}</span>
                                <span class="detail-value ip-pair copyable"
                                    @click="copyToClipboard(getIpPairString(routerInfo?.ipv4, sessionMetadata?.ipv4), 'IPv4 Pair')"
                                    :title="t('pages.metrics.clickToCopy')">
                                    <template v-if="typeof ipv4Display === 'object' && ipv4Display.isPair">
                                        <span class="ip-server">{{ ipv4Display.server }}</span>
                                        <v-icon class="ip-separator" size="small">mdi-swap-horizontal</v-icon>
                                        <span class="ip-user">{{ ipv4Display.user }}</span>
                                    </template>
                                    <template v-else>
                                        {{ ipv4Display }}
                                    </template>
                                </span>
                            </div>
                            <div class="detail-item" v-if="routerInfo?.ipv6 || sessionMetadata?.ipv6"
                                :class="{ 'detail-item-full-width': typeof ipv6Display === 'object' && ipv6Display.isPair }">
                                <span class="detail-label">{{ t('pages.metrics.ipv6Address') }}</span>
                                <span class="detail-value ip-pair copyable"
                                    @click="copyToClipboard(getIpPairString(routerInfo?.ipv6, sessionMetadata?.ipv6), 'IPv6 Pair')"
                                    :title="t('pages.metrics.clickToCopy')">
                                    <template v-if="typeof ipv6Display === 'object' && ipv6Display.isPair">
                                        <span class="ip-server">{{ ipv6Display.server }}</span>
                                        <v-icon class="ip-separator" size="small">mdi-swap-horizontal</v-icon>
                                        <span class="ip-user">{{ ipv6Display.user }}</span>
                                    </template>
                                    <template v-else>
                                        {{ ipv6Display }}
                                    </template>
                                </span>
                            </div>
                            <div class="detail-item" v-if="routerInfo?.ipv6LinkLocal || sessionMetadata?.ipv6LinkLocal"
                                :class="{ 'detail-item-full-width': typeof ipv6LinkLocalDisplay === 'object' && ipv6LinkLocalDisplay.isPair }">
                                <span class="detail-label">{{ t('pages.metrics.ipv6LinkLocal') }}</span>
                                <span class="detail-value ip-pair copyable"
                                    @click="copyToClipboard(getIpPairString(routerInfo?.ipv6LinkLocal, sessionMetadata?.ipv6LinkLocal), 'IPv6 Link-Local Pair')"
                                    :title="t('pages.metrics.clickToCopy')">
                                    <template
                                        v-if="typeof ipv6LinkLocalDisplay === 'object' && ipv6LinkLocalDisplay.isPair">
                                        <span class="ip-server">{{ ipv6LinkLocalDisplay.server }}</span>
                                        <v-icon class="ip-separator" size="small">mdi-swap-horizontal</v-icon>
                                        <span class="ip-user">{{ ipv6LinkLocalDisplay.user }}</span>
                                    </template>
                                    <template v-else>
                                        {{ ipv6LinkLocalDisplay }}
                                    </template>
                                </span>
                            </div>

                            <!-- Session Info Content -->
                            <div ref="cardRef" v-if="sessionInfo" class="session-info-container">
                                <div class="session-info-content" v-html="sessionInfo.parsed"></div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <!-- Metrics Overview -->
            <div class="metrics-overview" v-if="getLatestMetrics">
                <div class="metrics-grid">
                    <!-- BGP IPv4 Routes Metric -->
                    <div class="metric-item bgp-routes-ipv4" @click="scrollToBgpCharts" style="cursor: pointer;"
                        :title="t('pages.metrics.clickToViewChart')">
                        <div class="metric-icon bgp-routes">
                            <span>IPv4</span>
                        </div>
                        <div class="metric-content">
                            <div class="metric-value-row">
                                <div class="metric-value-pair">
                                    <div class="metric-value">{{ getLatestMetrics.bgp?.routes?.ipv4?.imported?.current
                                        || 0 }}</div>
                                    <div class="metric-sub-label">{{ t('pages.metrics.received') }}</div>
                                </div>
                                <div class="metric-separator">|</div>
                                <div class="metric-value-pair">
                                    <div class="metric-value">{{ getLatestMetrics.bgp?.routes?.ipv4?.exported?.current
                                        || 0 }}</div>
                                    <div class="metric-sub-label">{{ t('pages.metrics.advertised') }}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- BGP IPv6 Routes Metric -->
                    <div class="metric-item bgp-routes-ipv6" @click="scrollToBgpCharts" style="cursor: pointer;"
                        :title="t('pages.metrics.clickToViewChart')">
                        <div class="metric-icon bgp-routes">
                            <span>IPv6</span>
                        </div>
                        <div class="metric-content">
                            <div class="metric-value-row">
                                <div class="metric-value-pair">
                                    <div class="metric-value">{{ getLatestMetrics.bgp?.routes?.ipv6?.imported?.current
                                        || 0 }}</div>
                                    <div class="metric-sub-label">{{ t('pages.metrics.received') }}</div>
                                </div>
                                <div class="metric-separator">|</div>
                                <div class="metric-value-pair">
                                    <div class="metric-value">{{ getLatestMetrics.bgp?.routes?.ipv6?.exported?.current
                                        || 0 }}</div>
                                    <div class="metric-sub-label">{{ t('pages.metrics.advertised') }}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Traffic Combined Metric -->
                    <div class="metric-item traffic-combined" @click="scrollToInterfaceChart" style="cursor: pointer;"
                        :title="t('pages.metrics.clickToViewChart')">
                        <div class="metric-icon traffic-total">
                            <v-icon>mdi-chart-pie</v-icon>
                        </div>
                        <div class="metric-content">
                            <div class="metric-value-row">
                                <div class="metric-value-pair">
                                    <div class="metric-value">{{
                                        formatBytes(getLatestMetrics.interface?.traffic?.total?.[0] || 0)
                                    }}</div>
                                    <div class="metric-sub-label">{{ t('pages.metrics.txTotal') }}</div>
                                </div>
                                <div class="metric-separator">|</div>
                                <div class="metric-value-pair">
                                    <div class="metric-value">{{
                                        formatBytes(getLatestMetrics.interface?.traffic?.total?.[1] || 0)
                                    }}</div>
                                    <div class="metric-sub-label">{{ t('pages.metrics.rxTotal') }}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Traffic Current Rates Metric -->
                    <div class="metric-item traffic-current" @click="scrollToInterfaceChart" style="cursor: pointer;"
                        :title="t('pages.metrics.clickToViewChart')">
                        <div class="metric-icon traffic-total">
                            <v-icon>mdi-swap-horizontal</v-icon>
                        </div>
                        <div class="metric-content">
                            <div class="metric-value-row">
                                <div class="metric-value-pair">
                                    <div class="metric-value">{{
                                        formatBytes(getLatestMetrics.interface?.traffic?.current?.[0] || 0)
                                    }}/s</div>
                                    <div class="metric-sub-label">{{ t('pages.metrics.txCurrent') }}</div>
                                </div>
                                <div class="metric-separator">|</div>
                                <div class="metric-value-pair">
                                    <div class="metric-value">{{
                                        formatBytes(getLatestMetrics.interface?.traffic?.current?.[1] || 0)
                                    }}/s</div>
                                    <div class="metric-sub-label">{{ t('pages.metrics.rxCurrent') }}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- RTT Metric -->
                    <div class="metric-item" @click="scrollToRttChart" style="cursor: pointer;"
                        :title="t('pages.metrics.clickToViewChart')">
                        <div class="metric-icon rtt"
                            :class="{ timeout: rttDisplayValue === t('pages.metrics.timeout') }">
                            <v-icon>mdi-gauge</v-icon>
                        </div>
                        <div class="metric-content">
                            <div class="metric-value-row">
                                <div class="metric-value-pair">
                                    <div class="metric-value"
                                        :class="{ timeout: rttDisplayValue === t('pages.metrics.timeout') }">
                                        {{ rttDisplayValue }}
                                        <span v-if="rttDisplayValue !== t('pages.metrics.timeout')"
                                            class="metric-unit">ms</span>
                                    </div>
                                    <div class="metric-sub-label">{{ t('pages.metrics.currentRtt') }}</div>
                                </div>
                                <div class="metric-separator">|</div>
                                <div class="metric-value-pair">
                                    <div class="metric-value">{{ rttLossDisplayValue }}%</div>
                                    <div class="metric-sub-label">{{ t('pages.metrics.packetLoss') }}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- BGP Session Status Cards (Individual for each session) -->
                    <div v-if="sessionMetrics?.bgp && sessionMetrics.bgp.length > 0"
                        v-for="(bgpSession, index) in sessionMetrics.bgp" :key="index" class="metric-item"
                        @click="scrollToBgpDetails" style="cursor: pointer;"
                        :title="t('pages.metrics.clickToViewDetails')">
                        <div class="metric-icon bgp-status" :class="{
                            active: bgpSession.info?.includes('Established'),
                            timeout: bgpSession.info && !bgpSession.info.includes('Established') && bgpSession.info !== 'Unknown'
                        }">
                            <v-icon>mdi-router-wireless</v-icon>
                        </div>
                        <div class="metric-content">
                            <div class="metric-value status" :class="{
                                active: bgpSession.info?.includes('Established'),
                                timeout: bgpSession.info && !bgpSession.info.includes('Established') && bgpSession.info !== 'Unknown'
                            }">
                                {{ t(`pages.metrics.bgpStatus['${bgpSession.info?.split(' ')[0] || 'Unknown'}']`) }}
                            </div>
                            <div class="metric-label">{{
                                bgpSession.name?.toLowerCase().includes('v4') ? `${t('pages.metrics.bgpSession')}
                                (IPv4)` :
                                    bgpSession.name?.toLowerCase().includes('v6') ? `${t('pages.metrics.bgpSession')}
                                (IPv6)` :
                                        bgpSession.name ? `${t('pages.metrics.bgpSession')} (MP-BGP)` :
                                            t('pages.metrics.bgpSession')
                            }}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Charts Section -->
            <div class="charts-section"> <!-- BGP Metrics Charts -->
                <div class="chart-group" ref="bgpChartsSection">
                    <h2 class="section-title">{{ t('pages.metrics.bgpMetrics') }}</h2>
                    <div v-if="sessionMetrics.bgp && sessionMetrics.bgp.length > 0" class="charts-grid">
                        <!-- IPv4 BGP Charts -->
                        <div v-if="hasBgpIPv4ReceivedData" class="chart-container">
                            <h3 class="chart-title">{{ t('pages.metrics.routesReceivedIPv4') }}</h3>
                            <v-chart ref="bgpIPv4ReceivedChart" :option="bgpIPv4ReceivedOption"
                                :style="{ height: '300px', width: '100%' }" :autoresize="true" />
                        </div>
                        <div v-if="hasBgpIPv4AdvertisedData" class="chart-container">
                            <h3 class="chart-title">{{ t('pages.metrics.routesAdvertisedIPv4') }}</h3>
                            <v-chart ref="bgpIPv4AdvertisedChart" :option="bgpIPv4AdvertisedOption"
                                :style="{ height: '300px', width: '100%' }" :autoresize="true" />
                        </div>
                        <!-- IPv6 BGP Charts -->
                        <div v-if="hasBgpIPv6ReceivedData" class="chart-container">
                            <h3 class="chart-title">{{ t('pages.metrics.routesReceivedIPv6') }}</h3>
                            <v-chart ref="bgpIPv6ReceivedChart" :option="bgpIPv6ReceivedOption"
                                :style="{ height: '300px', width: '100%' }" :autoresize="true" />
                        </div>
                        <div v-if="hasBgpIPv6AdvertisedData" class="chart-container">
                            <h3 class="chart-title">{{ t('pages.metrics.routesAdvertisedIPv6') }}</h3>
                            <v-chart ref="bgpIPv6AdvertisedChart" :option="bgpIPv6AdvertisedOption"
                                :style="{ height: '300px', width: '100%' }" :autoresize="true" />
                        </div>

                        <!-- Show empty state if no BGP data available -->
                        <div v-if="!hasBgpIPv4ReceivedData && !hasBgpIPv4AdvertisedData && !hasBgpIPv6ReceivedData && !hasBgpIPv6AdvertisedData"
                            class="chart-container full-width">
                            <div class="empty-state">
                                <div class="empty-icon">📊</div>
                                <div class="empty-text">{{ t('pages.metrics.noData') }}</div>
                            </div>
                        </div>
                    </div>
                    <div v-else class="chart-container full-width">
                        <div class="empty-state">
                            <div class="empty-icon">📊</div>
                            <div class="empty-text">{{ t('pages.metrics.noData') }}</div>
                        </div>
                    </div>
                </div>

                <!-- Interface Metrics Chart -->
                <div class="chart-group" ref="interfaceChartSection">
                    <h2 class="section-title">{{ t('pages.metrics.interfaceMetrics') }}</h2>
                    <div class="chart-container full-width">
                        <v-chart ref="interfaceChart"
                            v-if="sessionMetrics.interface?.traffic?.metric && sessionMetrics.interface.traffic.metric.length > 0"
                            :option="interfaceMetricsOption" :style="{ height: '350px', width: '100%' }"
                            :autoresize="true" />
                        <div v-else class="empty-state">
                            <div class="empty-icon">📡</div>
                            <div class="empty-text">{{ t('pages.metrics.noData') }}</div>
                        </div>
                    </div>
                </div>

                <!-- RTT Metrics Chart -->
                <div class="chart-group" ref="rttChartSection">
                    <h2 class="section-title">{{ t('pages.metrics.networkMetrics') }}</h2>
                    <div class="chart-container full-width">
                        <v-chart ref="rttChart"
                            v-if="sessionMetrics.rtt?.metric && sessionMetrics.rtt.metric.length > 0"
                            :option="rttMetricsOption" :style="{ height: '350px', width: '100%' }" :autoresize="true" />
                        <div v-else class="empty-state">
                            <div class="empty-icon">🌐</div>
                            <div class="empty-text">{{ t('pages.metrics.noData') }}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Details Section -->
            <div class="details-section" ref="detailsSection">
                <h2 class="section-title">{{ t('pages.metrics.detailedMetrics') }}</h2>
                <div class="details-tabs">
                    <v-tabs v-model="activeTabKey" size="large" class="mb-6">
                        <v-tab value="interface-details">{{ t('pages.metrics.interfaceDetails') }}</v-tab>
                        <v-tab value="bgp-details">{{ t('pages.metrics.bgpDetails') }}</v-tab>
                    </v-tabs>
                    <v-window v-model="activeTabKey">
                        <!-- Interface Details Tab -->
                        <v-window-item value="interface-details">
                            <div class="table-container">
                                <v-data-table v-if="hasAnyInterfaceData" :items="[getLatestMetrics!.interface]"
                                    :headers="interfaceHeaders" :items-per-page="-1" density="compact"
                                    hover class="elevation-0">
                                    <template #item.currentRates="{ item }">
                                        ↑ {{ formatBytes(item.traffic?.current?.[0] || 0) }}/s, ↓ {{ formatBytes(item.traffic?.current?.[1] || 0) }}/s
                                    </template>
                                </v-data-table>
                                <!-- Empty State -->
                                <div v-else class="empty-state">
                                    <div class="empty-icon">📋</div>
                                    <div class="empty-text">{{ t('pages.metrics.noData') }}</div>
                                </div>
                            </div>
                        </v-window-item>
                        <!-- BGP Details Tab -->
                        <v-window-item value="bgp-details">
                            <div class="table-container">
                                <v-data-table v-if="hasAnyBgpData" :items="sessionMetrics!.bgp" :headers="bgpHeaders"
                                    :items-per-page="-1" density="compact" hover class="elevation-0"
                                    @click:row="(_: any, { item }: any) => openLookingGlassPage(item)">
                                    <template #item.routes.ipv4.imported.current="{ item }">
                                        {{ formatNumber(item.routes?.ipv4?.imported?.current || 0) }}
                                    </template>
                                    <template #item.routes.ipv4.exported.current="{ item }">
                                        {{ formatNumber(item.routes?.ipv4?.exported?.current || 0) }}
                                    </template>
                                    <template #item.routes.ipv6.imported.current="{ item }">
                                        {{ formatNumber(item.routes?.ipv6?.imported?.current || 0) }}
                                    </template>
                                    <template #item.routes.ipv6.exported.current="{ item }">
                                        {{ formatNumber(item.routes?.ipv6?.exported?.current || 0) }}
                                    </template>
                                </v-data-table>
                                <!-- Empty State -->
                                <div v-else class="empty-state">
                                    <div class="empty-icon">🔗</div>
                                    <div class="empty-text">{{ t('pages.metrics.noData') }}</div>
                                </div>
                            </div>
                        </v-window-item>
                    </v-window>
                </div>
            </div>
        </div>

        <!-- Loading State with Skeletons -->
        <div v-else-if="loading" id="metrics">
            <!-- Header Actions Skeleton -->
            <div class="header-actions">
                <v-btn @click="goBack" variant="text" size="large" class="back-button" prepend-icon="mdi-arrow-left">
                    {{ t('pages.metrics.back') }}
                </v-btn>
                <v-skeleton-loader type="button" style="width: 120px; margin-left: auto;" />
            </div>

            <!-- Session Header Skeleton -->
            <div class="session-header">
                <div class="session-header-main">
                    <v-skeleton-loader type="avatar" />
                    <div class="session-info" style="margin-left: 16px; flex: 1;">
                        <v-skeleton-loader type="heading" style="width: 300px; height: 32px; margin-bottom: 8px;" />
                        <v-skeleton-loader type="paragraph" />
                    </div>
                </div>

                <!-- Session Details Cards Skeleton -->
                <div class="session-details-grid">
                    <!-- Session Info Card Skeleton -->
                    <div class="session-detail-card">
                        <div class="detail-card-header">
                            <v-skeleton-loader type="avatar" />
                            <v-skeleton-loader type="text" style="width: 150px; margin-left: 12px;" />
                        </div>
                        <div class="detail-card-content">
                            <v-skeleton-loader type="paragraph" />
                        </div>
                    </div>

                    <!-- Network Info Card Skeleton -->
                    <div class="session-detail-card">
                        <div class="detail-card-header">
                            <v-skeleton-loader type="avatar" />
                            <v-skeleton-loader type="text" style="width: 120px; margin-left: 12px;" />
                        </div>
                        <div class="detail-card-content">
                            <v-skeleton-loader type="paragraph" />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Metrics Overview Skeleton -->
            <div class="metrics-overview">
                <div class="metrics-grid">
                    <!-- Create 6 metric card skeletons -->
                    <div v-for="i in 6" :key="i" class="metric-item">
                        <v-skeleton-loader type="avatar" />
                        <div class="metric-content" style="margin-left: 16px; flex: 1;">
                            <v-skeleton-loader type="paragraph" />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Charts Section Skeleton -->
            <div class="charts-section">
                <!-- BGP Metrics Charts Skeleton -->
                <div class="chart-group">
                    <v-skeleton-loader type="heading" style="width: 200px; height: 32px; margin-bottom: 24px;" />
                    <div class="charts-grid">
                        <div v-for="i in 4" :key="i" class="chart-container">
                            <v-skeleton-loader type="text" style="width: 180px; height: 24px; margin-bottom: 16px;" />
                            <v-skeleton-loader type="paragraph" />
                        </div>
                    </div>
                </div>

                <!-- Interface Metrics Chart Skeleton -->
                <div class="chart-group">
                    <v-skeleton-loader type="heading" style="width: 180px; height: 32px; margin-bottom: 24px;" />
                    <div class="chart-container full-width">
                        <v-skeleton-loader type="paragraph" />
                    </div>
                </div>

                <!-- RTT Metrics Chart Skeleton -->
                <div class="chart-group">
                    <v-skeleton-loader type="heading" style="width: 160px; height: 32px; margin-bottom: 24px;" />
                    <div class="chart-container full-width">
                        <v-skeleton-loader type="paragraph" />
                    </div>
                </div>
            </div>

            <!-- Details Section Skeleton -->
            <div class="details-section">
                <v-skeleton-loader type="heading" style="width: 180px; height: 32px; margin-bottom: 24px;" />
                <div class="details-tabs">
                    <!-- Tab headers skeleton -->
                    <div
                        style="display: flex; gap: 32px; margin-bottom: 24px; border-bottom: 1px solid #f0f0f0; padding-bottom: 12px;">
                        <v-skeleton-loader type="button" style="width: 120px;" />
                        <v-skeleton-loader type="button" style="width: 100px;" />
                    </div>
                    <!-- Tab content skeleton -->
                    <v-skeleton-loader type="paragraph" />
                </div>
            </div>
        </div>

        <!-- Error State -->
        <div v-else-if="!loading && !sessionMetrics" id="metrics">
            <div class="header-actions">
                <v-btn @click="goBack" variant="text" size="large" class="back-button" prepend-icon="mdi-arrow-left">
                    {{ t('pages.metrics.back') }}
                </v-btn>
            </div>
            <div class="error-container">
                <div class="text-center pa-8">
                    <v-icon size="64" color="warning">mdi-alert-circle-outline</v-icon>
                    <h2>{{ t('pages.metrics.noMetricsFound') }}</h2>
                    <p>{{ t('pages.metrics.noMetricsFoundDesc') }}</p>
                    <v-btn color="primary" @click="goBack">
                        {{ t('pages.metrics.goBack') }}
                    </v-btn>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
// =============================================================================
// IMPORTS
// =============================================================================
import { onMounted, Ref, ref, computed, onUnmounted, nextTick, watchEffect } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
// Dynamic ECharts imports for better performance
import { VChart } from '../../components/EChartsLoader'

// Application imports
import { loggedIn, formatDate, formatRelativeTime, themeName, isAdmin, formatBytes, registerPageTitle, deriveProbeStatuses, showSnackbar } from '../../common/helper'
import type { ProbeStatusKey } from '../../common/helper'
import { makeRequest, SessionMetric, RouterMetadata, RoutersResponse, CurrentSessionMetadata, GetCurrentSessionResponse, RoutingPolicy, SessionStatus, BGPMetric } from '../../common/packetHandler'
import RouterLocationAvatar from '../../components/RouterLocationAvatar.vue'
import config from '../../config'

// Markdown imports
//@ts-ignore
import markdown_it from 'markdown-it'
//@ts-ignore
import mila from 'markdown-it-link-attributes'

// Import external stylesheet
import './sessionMetrics.css'

// =============================================================================
// INITIALIZATION
// =============================================================================
// Initialize markdown parser
const md = new markdown_it({ html: true })
md.use(mila, { attrs: { target: "_blank" } })
const cardRef = ref<HTMLElement>()
const codeClickHandlers = new Map<HTMLElement, () => void>()

// ECharts components are now loaded dynamically via EChartsLoader

// =============================================================================
// COMPOSABLES
// =============================================================================
const { t } = useI18n()
const router = useRouter()
const route = useRoute()

// =============================================================================
// REACTIVE STATE
// =============================================================================
const loading = ref(true)
const sessionId = route.params.sessionId as string
const routerId = route.params.routerId as string
const windowWidth = ref(window.innerWidth)

// Data refs
const sessionMetrics: Ref<SessionMetric | null> = ref(null)
const routerInfo: Ref<RouterMetadata | null> = ref(null)
const sessionMetadata: Ref<CurrentSessionMetadata | null> = ref(null)

// Navigation refs
const detailsSection = ref<HTMLElement>()
const rttChartSection = ref<HTMLElement>()
const bgpChartsSection = ref<HTMLElement>()
const interfaceChartSection = ref<HTMLElement>()
const activeTabKey = ref('interface-details')

// Chart refs for manual resize
const bgpIPv4ReceivedChart = ref()
const bgpIPv4AdvertisedChart = ref()
const bgpIPv6ReceivedChart = ref()
const bgpIPv6AdvertisedChart = ref()
const interfaceChart = ref()
const rttChart = ref()

// Countdown timer refs
const countdownSeconds = ref(0)
let countdownInterval: number | null = null

// =============================================================================
// COMPUTED PROPERTIES
// =============================================================================
// Chart configuration
const isDark = computed(() => themeName.value === 'dark')
const chartTheme = computed(() => ({
    backgroundColor: isDark.value ? '#1f1f1f' : '#ffffff',
    textStyle: {
        color: isDark.value ? '#ffffff' : '#333333'
    }
}))

// Get latest metrics data
const getLatestMetrics = computed(() => {
    if (!sessionMetrics.value) return null

    // For BGP data, we need to aggregate from all sessions to handle traditional BGP setups
    let bgpData = null
    if (sessionMetrics.value.bgp && sessionMetrics.value.bgp.length > 0) {
        // Find IPv4 and IPv6 sessions based on type and data presence
        const ipv4Session = sessionMetrics.value.bgp.find(session => {
            const isValidForIPv4 = session.type === 'mpbgp' || session.type === 'ipv4' || session.type === ''
            const hasValidData = session.routes?.ipv4?.imported?.current > 0 || session.routes?.ipv4?.exported?.current > 0
            return isValidForIPv4 && hasValidData
        })
        const ipv6Session = sessionMetrics.value.bgp.find(session => {
            const isValidForIPv6 = session.type === 'mpbgp' || session.type === 'ipv6' || session.type === ''
            const hasValidData = session.routes?.ipv6?.imported?.current > 0 || session.routes?.ipv6?.exported?.current > 0
            return isValidForIPv6 && hasValidData
        })

        // Create aggregated BGP data
        bgpData = {
            routes: {
                ipv4: {
                    imported: { current: ipv4Session?.routes?.ipv4?.imported?.current || 0 },
                    exported: { current: ipv4Session?.routes?.ipv4?.exported?.current || 0 }
                },
                ipv6: {
                    imported: { current: ipv6Session?.routes?.ipv6?.imported?.current || 0 },
                    exported: { current: ipv6Session?.routes?.ipv6?.exported?.current || 0 }
                }
            }
        }
    }

    return {
        bgp: bgpData,
        interface: sessionMetrics.value.interface || null,
        rtt: sessionMetrics.value.rtt || null
    }
})

// Get RTT display value with timeout handling
const rttDisplayValue = computed(() => {
    const rttValue = getLatestMetrics.value?.rtt?.current
    if (rttValue === undefined || rttValue === null) return '0'
    if (rttValue === -1) return t('pages.metrics.timeout')
    return rttValue.toString()
})

// Get RTT loss display value
const rttLossDisplayValue = computed(() => {
    const lossValue = getLatestMetrics.value?.rtt?.loss
    if (lossValue === undefined || lossValue === null) return '0.0'
    return (lossValue * 100).toFixed(1) // Convert to percentage and format to 1 decimal place
})

// Format countdown timer display
const countdownDisplay = computed(() => {
    const totalSeconds = countdownSeconds.value
    if (totalSeconds <= 0) return '00:00:00'

    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
})

// Get session info from sessionMetrics.data
const sessionInfo = computed(() => {
    if (!sessionMetrics.value?.data || typeof sessionMetrics.value.data === 'string') return null
    const rawInfo = sessionMetrics.value.data.info
    if (!rawInfo) return null

    return {
        raw: rawInfo,
        parsed: md.render(rawInfo)
    }
})

const codeBlockWatcher = watchEffect(() => {
    if (sessionInfo.value?.parsed) {
        cleanupCodeListeners()
        setupCodeListeners()
    }
})

// Check if there's any meaningful interface data to display
const hasAnyInterfaceData = computed(() => {
    if (!getLatestMetrics.value?.interface) return false
    const interfaceData = getLatestMetrics.value.interface

    // Check basic interface fields
    const hasBasicData = hasData('ipv4', interfaceData) ||
        hasData('ipv6', interfaceData) ||
        hasData('ipv6LinkLocal', interfaceData) ||
        hasData('mtu', interfaceData) ||
        hasData('status', interfaceData)

    // Check traffic data
    const hasTrafficData = interfaceData.traffic?.current &&
        (interfaceData.traffic.current[0] > 0 || interfaceData.traffic.current[1] > 0)

    return hasBasicData || hasTrafficData
})

// Check if there's any BGP data to display
const hasAnyBgpData = computed(() => {
    return sessionMetrics.value?.bgp && sessionMetrics.value.bgp.length > 0
})

const PROBE_STATUS_COLORS: Record<ProbeStatusKey, string> = {
  testedOk: '#52c41a',
  noRouting: '#ff4d4f',
  nat: '#faad14',
  notAvailable: '#d9d9d9'
}

const probeStatusDisplay = computed(() => {
    if (!sessionMetadata.value) return []
    return deriveProbeStatuses(sessionMetadata.value.probe || null).map(status => ({
        ...status,
        label: t(`pages.metrics.probeStatus.labels.${status.key}`),
        description: t(`pages.metrics.probeStatus.descriptions.${status.key}`),
        color: PROBE_STATUS_COLORS[status.key]
    }))
})

// =============================================================================
// METHODS
// =============================================================================

// Navigation functions
// Generic function to scroll to a section with highlight effect
const scrollToSection = (sectionRef: Ref<HTMLElement | undefined>, highlightColor: string, tabKey?: string) => {
    // Switch tab if specified (for BGP details)
    if (tabKey) {
        activeTabKey.value = tabKey
    }

    // Scroll to section with smooth animation
    nextTick(() => {
        if (sectionRef.value) {
            sectionRef.value.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            })

            // Add a brief highlight effect to the section
            sectionRef.value.style.transition = 'all 0.3s ease'
            sectionRef.value.style.transform = 'scale(1.01)'
            sectionRef.value.style.boxShadow = `0 8px 24px ${highlightColor}`

            // Reset the highlight effect after animation
            setTimeout(() => {
                if (sectionRef.value) {
                    sectionRef.value.style.transform = 'scale(1)'
                    sectionRef.value.style.boxShadow = ''
                }
            }, 500)
        }
    })
}

// Specific scroll functions using the generic function
const scrollToBgpDetails = () => scrollToSection(detailsSection, 'rgba(24, 144, 255, 0.15)', 'bgp-details')
const scrollToRttChart = () => scrollToSection(rttChartSection, 'rgba(114, 46, 209, 0.15)')
const scrollToBgpCharts = () => scrollToSection(bgpChartsSection, 'rgba(82, 196, 26, 0.15)')
const scrollToInterfaceChart = () => scrollToSection(interfaceChartSection, 'rgba(255, 77, 79, 0.15)')

// Data fetching functions
const fetchSessionMetrics = async () => {
    try {
        const resp = await makeRequest(t, isAdmin.value ? '/admin' : '/session', {
            action: isAdmin.value ? 'querySession' : 'query',
            session: sessionId,
            router: routerId
        })

        if (resp.success && resp.response) {
            const data = resp.response as unknown as SessionMetric
            if (data) {
                sessionMetrics.value = data
            }
        }
    } catch (error) {
        console.error(error)
        showSnackbar(t('pages.metrics.fetchError'), 'error')
    }
}

const fetchRouterInfo = async () => {
    try {
        const resp = await makeRequest(t, '/list/routers')
        if (resp.success && resp.response) {
            const data = resp.response as RoutersResponse
            if (data && Array.isArray(data.routers)) {
                routerInfo.value = data.routers.find(r => r.uuid === routerId) || null
            }
        }
    } catch (error) {
        console.error(error)
    }
}

const fetchSessionMetadata = async () => {
    try {
        const resp = await makeRequest(t, '/session', {
            action: 'get',
            session: sessionId
        })

        if (resp.success && resp.response) {
            const data = resp.response as unknown as GetCurrentSessionResponse
            if (data?.session) {
                sessionMetadata.value = data.session
            }
        }
    } catch (error) {
        console.error(error)
    }
}

// UI action functions
// Helper functions for IP pair display
const getIpPairDisplay = (serverIp: string | null | undefined, userIp: string | null | undefined) => {
    const server = serverIp || ''
    const user = userIp || ''

    if (!server && !user) {
        return t('pages.metrics.notAvailable')
    }

    if (!user) {
        return server
    }

    if (!server) {
        return user
    }

    return { server, user, isPair: true }
}

const getIpPairString = (serverIp: string | null | undefined, userIp: string | null | undefined) => {
    const server = serverIp || ''
    const user = userIp || ''

    if (!server && !user) {
        return t('pages.metrics.notAvailable')
    }

    if (!user) {
        return server
    }

    if (!server) {
        return user
    }

    return `${server} ↔ ${user}`
}

const goBack = () => {
    router.back()
}

// Computed properties for IP displays
const ipv4Display = computed(() => getIpPairDisplay(routerInfo.value?.ipv4, sessionMetadata.value?.ipv4));
const ipv6Display = computed(() => getIpPairDisplay(routerInfo.value?.ipv6, sessionMetadata.value?.ipv6));
const ipv6LinkLocalDisplay = computed(() => getIpPairDisplay(routerInfo.value?.ipv6LinkLocal, sessionMetadata.value?.ipv6LinkLocal));

const grafanaPeerNames = computed(() => {
    const peers: string[] = []
    const seen = new Set<string>()

    const addPeer = (rawName?: string | null) => {
        if (!rawName) return
        const name = rawName.trim()
        if (!name || seen.has(name)) return
        seen.add(name)
        peers.push(name)
    }

    if (sessionMetrics.value?.bgp && sessionMetrics.value.bgp.length > 0) {
        const sessions = sessionMetrics.value.bgp

        const mpSessions = sessions.filter(session => session.type === 'mpbgp')
        if (mpSessions.length > 0) {
            mpSessions.forEach(session => addPeer(session.name))
            return peers
        }

        const fallbackByName = (needle: string) => sessions.filter(session => session.name?.toLowerCase().includes(needle))

        const addSessions = (targets: BGPMetric[]) => targets.forEach(session => addPeer(session.name))

        const ipv4Sessions = sessions.filter(session => session.type === 'ipv4')
        const ipv6Sessions = sessions.filter(session => session.type === 'ipv6')

        addSessions(ipv4Sessions.length > 0 ? ipv4Sessions : fallbackByName('v4'))
        addSessions(ipv6Sessions.length > 0 ? ipv6Sessions : fallbackByName('v6'))

        if (peers.length === 0) {
            addSessions(sessions)
        }

        return peers
    }

    const fallbackInterface = sessionMetadata.value?.interface?.trim()
    if (fallbackInterface) addPeer(fallbackInterface)

    return peers
})

const canOpenGrafana = computed(() => Boolean(routerInfo.value?.uuid) && grafanaPeerNames.value.length > 0)

const copyToClipboard = async (value: string, label: string) => {
    try {
        await navigator.clipboard.writeText(value)
        showSnackbar(t('pages.nodes.copied'), 'info')
    } catch (error) {
        console.error(`Failed to copy ${label}:`, error)
    }
}

const copySessionId = () => copyToClipboard(sessionId, 'session ID')

// Function to format BGP extensions array
const formatBgpExtensions = (extensions: string[]) => {
    if (!extensions || extensions.length === 0) return t('pages.metrics.none')
    return extensions.map(ext => {
        const translationKey = `pages.peering.${ext}`
        const translated = t(translationKey)
        // If translation exists, use it; otherwise use the original extension name
        return translated !== translationKey ? translated : ext
    }).join(', ')
}

const refreshData = async () => {
    try {
        loading.value = true
        await Promise.allSettled([
            fetchSessionMetrics(),
            fetchRouterInfo(),
            fetchSessionMetadata()
        ])
    } catch (error) {
        console.error(error)
    } finally {
        loading.value = false
    }
    // Restart countdown timer after refreshing data
    if (canRefreshData()) startCountdownTimer()
}

const canRefreshData = () => {
    if (!sessionMetadata.value) return true
    switch (sessionMetadata.value.status) {
        case SessionStatus.DISABLED:
        case SessionStatus.PENDING_APPROVAL:
        case SessionStatus.QUEUED_FOR_DELETE:
        case SessionStatus.QUEUED_FOR_SETUP:
        case SessionStatus.TEARDOWN:
        case SessionStatus.DELETED:
            return false
        default:
            return true
    }
}

// Countdown timer functions
const startCountdownTimer = () => {
    if (!canRefreshData() || !sessionMetrics.value?.timestamp) return

    // Calculate seconds until next refresh based on last update time and refresh interval
    const lastUpdateTime = sessionMetrics.value.timestamp * 1000 // Convert to milliseconds
    const refreshIntervalMs = config.metricPageRefreshInterval
    const nextUpdateTime = lastUpdateTime + refreshIntervalMs
    const now = Date.now()

    // Calculate remaining seconds
    const remainingMs = Math.max(0, nextUpdateTime - now)
    countdownSeconds.value = Math.floor(remainingMs / 1000)

    // Clear existing interval if any
    stopCountdownTimer()

    // Start countdown interval
    countdownInterval = setInterval(() => {
        if (countdownSeconds.value > 0) {
            countdownSeconds.value--
        } else {
            // Clear existing interval and fetch new data and then reset countdown
            stopCountdownTimer()
            refreshData()
        }
    }, 1000)
}

const stopCountdownTimer = () => {
    if (countdownInterval) {
        clearInterval(countdownInterval)
        countdownInterval = null
    }
}

// Session management functions
const simpleActionHandler = async (baseAction: 'delete' | 'enable' | 'disable') => {
    if (!sessionMetadata.value) return

    try {
        loading.value = true

        // Different endpoints and action names for admin vs normal user
        if (isAdmin.value) {
            // Admin uses /admin endpoint with longer action names
            const adminAction = baseAction === 'delete' ? 'deleteSession' :
                baseAction === 'enable' ? 'enableSession' : 'disableSession'

            await makeRequest(t, '/admin', {
                action: adminAction,
                router: routerId,
                session: sessionId,
            })
        } else {
            // Normal user uses /session endpoint with shorter action names
            await makeRequest(t, '/session', {
                action: baseAction,
                router: routerId,
                session: sessionId,
            })
        }

        // Refresh session metadata after action
        await fetchSessionMetadata()

        if (baseAction === 'delete') {
            router.back()
        }

    } catch (error) {
        console.error(error)
    } finally {
        loading.value = false
    }
}

const handleEnable = () => simpleActionHandler('enable')
const handleDisable = () => simpleActionHandler('disable')
const handleRemove = () => simpleActionHandler('delete')

const handleEdit = () => {
    if (!sessionMetadata.value) return
    router.push({
        path: `/nodes/${routerId}/edit/${sessionId}`
    })
}

const openGrafanaForSession = () => {
    if (!canOpenGrafana.value || !routerInfo.value?.uuid) return

    try {
        const url = new URL(config.grafana.urlPrefix)
        const routerParam = config.grafana.queryStringForLocating.router
        const sessionParam = config.grafana.queryStringForLocating.session

        url.searchParams.set(routerParam, routerInfo.value.uuid)
        url.searchParams.delete(sessionParam)

        grafanaPeerNames.value.forEach(peer => url.searchParams.append(sessionParam, peer))

        window.open(url.toString(), '_blank')?.focus()
    } catch (error) {
        console.error('Failed to open Grafana dashboard:', error)
    }
}

// Get status color for badge
const getStatusColor = (status: SessionStatus) => {
    switch (status) {
        case SessionStatus.ENABLED:
            return 'success'
        case SessionStatus.DISABLED:
            return 'info'
        case SessionStatus.PENDING_APPROVAL:
            return 'warning'
        case SessionStatus.PROBLEM:
            return 'error'
        case SessionStatus.QUEUED_FOR_SETUP:
            return 'primary'
        case SessionStatus.QUEUED_FOR_DELETE:
            return 'error'
        case SessionStatus.TEARDOWN:
            return 'grey'
        case SessionStatus.DELETED:
            return 'default'
        default:
            return 'default'
    }
}

// Handle window resize to trigger chart resize
let resizeTimeout: number | null = null
const handleResize = () => {
    windowWidth.value = window.innerWidth

    if (resizeTimeout) {
        clearTimeout(resizeTimeout)
    }
    resizeTimeout = setTimeout(() => {
        nextTick(() => {
            // Manually trigger resize for all charts
            if (bgpIPv4ReceivedChart.value) {
                bgpIPv4ReceivedChart.value.resize()
            }
            if (bgpIPv4AdvertisedChart.value) {
                bgpIPv4AdvertisedChart.value.resize()
            }
            if (bgpIPv6ReceivedChart.value) {
                bgpIPv6ReceivedChart.value.resize()
            }
            if (bgpIPv6AdvertisedChart.value) {
                bgpIPv6AdvertisedChart.value.resize()
            }
            if (interfaceChart.value) {
                interfaceChart.value.resize()
            }
            if (rttChart.value) {
                rttChart.value.resize()
            }
        })
    }, 100) // Debounce resize events
}

const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num)
}

// Function to get routing policy display name
const getRoutingPolicyName = (policy: RoutingPolicy) => {
    const policyNames = {
        [RoutingPolicy.FULL]: t('pages.peering.routingPolicyTypes.FULL'),
        [RoutingPolicy.TRANSIT]: t('pages.peering.routingPolicyTypes.TRANSIT'),
        [RoutingPolicy.PEER]: t('pages.peering.routingPolicyTypes.PEER'),
        [RoutingPolicy.DOWNSTREAM]: t('pages.peering.routingPolicyTypes.DOWNSTREAM'),
        [RoutingPolicy.UPSTREAM]: t('pages.peering.routingPolicyTypes.UPSTREAM')
    }
    return policyNames[policy] || t('pages.metrics.unknown')
}

const openLookingGlassPage = (item: BGPMetric) => {
    if (item && item.name) window.open(`${(config.lgUrl as Record<string, string>)[routerId]}${encodeURIComponent(item.name)}`, '_blank')?.focus()
}

// =============================================================================
// LIFECYCLE HOOKS
// =============================================================================
onMounted(async () => {
    if (!loggedIn.value) {
        showSnackbar(t('pages.nodes.pleaseSignIn'), 'info')
        router.replace({ path: '/signin' })
        return
    }

    if (!sessionId || !routerId) {
        showSnackbar(t('pages.metrics.invalidSession'), 'error')
        router.back()
        return
    }

    registerPageTitle(`${t('pages.metrics.sessionMetrics')} - ${sessionId}`)

    // Set loading state and fetch all data
    loading.value = true
    try {
        await Promise.allSettled([
            fetchSessionMetrics(),
            fetchRouterInfo(),
            fetchSessionMetadata()
        ])
    } finally {
        loading.value = false
    }

    // Start countdown timer for next refresh
    startCountdownTimer()

    // Add window resize listener for chart responsiveness
    window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
    stopCountdownTimer()
    cleanupCodeListeners()
    codeBlockWatcher()
    window.removeEventListener('resize', handleResize)
})

const setupCodeListeners = () => {
    if (!cardRef.value) return

    const codeElements = cardRef.value.querySelectorAll('code')
    codeElements.forEach(code => {
        const handler = () => {
            copyToClipboard(code.textContent || '', 'code block')
        }

        code.addEventListener('click', handler)
        code.style.cursor = 'pointer'

        // Store handler for cleanup
        codeClickHandlers.set(code as HTMLElement, handler)
    })
}

const cleanupCodeListeners = () => {
    codeClickHandlers.forEach((handler, element) => {
        element.removeEventListener('click', handler)
    })
    codeClickHandlers.clear()
}


// =============================================================================
// BGP DATA AVAILABILITY CHECKS
// =============================================================================
const hasBgpIPv4ReceivedData = computed(() => {
    if (!sessionMetrics.value?.bgp) return false
    return sessionMetrics.value.bgp.some(session => {
        // Only show IPv4 charts for MP-BGP sessions or explicit IPv4 sessions
        const isValidForIPv4 = session.type === 'mpbgp' || session.type === 'ipv4' || session.type === ''
        // Check if there's meaningful IPv4 data
        const hasValidData = session.routes?.ipv4?.imported?.metric && session.routes.ipv4.imported.metric.length > 0
        return isValidForIPv4 && hasValidData
    })
})

const hasBgpIPv4AdvertisedData = computed(() => {
    if (!sessionMetrics.value?.bgp) return false
    return sessionMetrics.value.bgp.some(session => {
        // Only show IPv4 charts for MP-BGP sessions or explicit IPv4 sessions
        const isValidForIPv4 = session.type === 'mpbgp' || session.type === 'ipv4' || session.type === ''
        // Check if there's meaningful IPv4 data
        const hasValidData = session.routes?.ipv4?.exported?.metric && session.routes.ipv4.exported.metric.length > 0
        return isValidForIPv4 && hasValidData
    })
})

const hasBgpIPv6ReceivedData = computed(() => {
    if (!sessionMetrics.value?.bgp) return false
    return sessionMetrics.value.bgp.some(session => {
        // Only show IPv6 charts for MP-BGP sessions or explicit IPv6 sessions
        const isValidForIPv6 = session.type === 'mpbgp' || session.type === 'ipv6' || session.type === ''
        // Check if there's meaningful IPv6 data
        const hasValidData = session.routes?.ipv6?.imported?.metric && session.routes.ipv6.imported.metric.length > 0
        return isValidForIPv6 && hasValidData
    })
})

const hasBgpIPv6AdvertisedData = computed(() => {
    if (!sessionMetrics.value?.bgp) return false
    return sessionMetrics.value.bgp.some(session => {
        // Only show IPv6 charts for MP-BGP sessions or explicit IPv6 sessions
        const isValidForIPv6 = session.type === 'mpbgp' || session.type === 'ipv6' || session.type === ''
        // Check if there's meaningful IPv6 data
        const hasValidData = session.routes?.ipv6?.exported?.metric && session.routes.ipv6.exported.metric.length > 0
        return isValidForIPv6 && hasValidData
    })
})

// =============================================================================
// CHART OPTIONS
// =============================================================================
const bgpIPv4ReceivedOption = computed(() => {
    if (!sessionMetrics.value?.bgp || sessionMetrics.value.bgp.length === 0) return {}

    // Find the IPv4 BGP session using type-based filtering and meaningful data check
    const ipv4Session = sessionMetrics.value.bgp.find(session => {
        // Only show IPv4 charts for MP-BGP sessions or explicit IPv4 sessions
        const isValidForIPv4 = session.type === 'mpbgp' || session.type === 'ipv4' || session.type === ''
        const hasMetrics = session.routes?.ipv4?.imported?.metric && session.routes.ipv4.imported.metric.length > 0
        return isValidForIPv4 && hasMetrics
    })

    if (!ipv4Session?.routes?.ipv4?.imported?.metric) return {}

    // Extract timestamps and route counts for IPv4 received routes
    const timestamps: string[] = []
    const routesReceived: number[] = []
    ipv4Session.routes.ipv4.imported.metric.forEach(([timestamp, value]: [number, number]) => {
        timestamps.push(new Date(timestamp * 1000).toLocaleString())
        routesReceived.push(value)
    })

    return {
        ...chartTheme.value,
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'cross' }
        },
        grid: { left: '5%', right: '5%', bottom: '10%', top: '5%' },
        toolbox: {
            feature: {
                saveAsImage: {},
                dataZoom: { yAxisIndex: 'none' }
            }
        },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: timestamps,
            axisLabel: { color: isDark.value ? '#ffffff' : '#333333' }
        },
        yAxis: {
            type: 'value',
            axisLabel: { color: isDark.value ? '#ffffff' : '#333333' },
            scale: true,
            splitNumber: 5
        },
        series: [
            {
                name: t('pages.metrics.routesReceivedIPv4'),
                type: 'line',
                smooth: true,
                symbol: 'circle',
                symbolSize: 6,
                lineStyle: { width: 3 },
                areaStyle: {
                    opacity: 0.3,
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: 'rgba(82, 196, 26, 0.3)' },
                            { offset: 1, color: 'rgba(82, 196, 26, 0.1)' }
                        ]
                    }
                },
                data: routesReceived,
                itemStyle: { color: '#52c41a' }
            }
        ]
    }
})

const bgpIPv4AdvertisedOption = computed(() => {
    if (!sessionMetrics.value?.bgp || sessionMetrics.value.bgp.length === 0) return {}

    // Find the IPv4 BGP session using type-based filtering and meaningful data check
    const ipv4Session = sessionMetrics.value.bgp.find(session => {
        // Only show IPv4 charts for MP-BGP sessions or explicit IPv4 sessions
        const isValidForIPv4 = session.type === 'mpbgp' || session.type === 'ipv4' || session.type === ''
        const hasMetrics = session.routes?.ipv4?.exported?.metric && session.routes.ipv4.exported.metric.length > 0
        return isValidForIPv4 && hasMetrics
    })

    if (!ipv4Session?.routes?.ipv4?.exported?.metric) return {}

    // Extract timestamps and route counts for IPv4 advertised routes
    const timestamps: string[] = []
    const routesAdvertised: number[] = []
    ipv4Session.routes.ipv4.exported.metric.forEach(([timestamp, value]: [number, number]) => {
        timestamps.push(new Date(timestamp * 1000).toLocaleString())
        routesAdvertised.push(value)
    })

    return {
        ...chartTheme.value,
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'cross' }
        },
        grid: { left: '5%', right: '5%', bottom: '10%', top: '5%' },
        toolbox: {
            feature: {
                saveAsImage: {},
                dataZoom: { yAxisIndex: 'none' }
            }
        },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: timestamps,
            axisLabel: { color: isDark.value ? '#ffffff' : '#333333' }
        },
        yAxis: {
            type: 'value',
            axisLabel: { color: isDark.value ? '#ffffff' : '#333333' },
            scale: true,
            splitNumber: 5
        },
        series: [
            {
                name: t('pages.metrics.routesAdvertisedIPv4'),
                type: 'line',
                smooth: true,
                symbol: 'circle',
                symbolSize: 6,
                lineStyle: { width: 3 },
                areaStyle: {
                    opacity: 0.3,
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: 'rgba(24, 144, 255, 0.3)' },
                            { offset: 1, color: 'rgba(24, 144, 255, 0.1)' }
                        ]
                    }
                },
                data: routesAdvertised,
                itemStyle: { color: '#1890ff' }
            }
        ]
    }
})

const bgpIPv6ReceivedOption = computed(() => {
    if (!sessionMetrics.value?.bgp || sessionMetrics.value.bgp.length === 0) return {}

    // Find the IPv6 BGP session using type-based filtering and meaningful data check
    const ipv6Session = sessionMetrics.value.bgp.find(session => {
        // Only show IPv6 charts for MP-BGP sessions or explicit IPv6 sessions
        const isValidForIPv6 = session.type === 'mpbgp' || session.type === 'ipv6' || session.type === ''
        const hasMetrics = session.routes?.ipv6?.imported?.metric && session.routes.ipv6.imported.metric.length > 0
        return isValidForIPv6 && hasMetrics
    })

    if (!ipv6Session?.routes?.ipv6?.imported?.metric) return {}

    // Extract timestamps and route counts for IPv6 received routes
    const timestamps: string[] = []
    const routesReceived: number[] = []
    ipv6Session.routes.ipv6.imported.metric.forEach(([timestamp, value]: [number, number]) => {
        timestamps.push(new Date(timestamp * 1000).toLocaleString())
        routesReceived.push(value)
    })

    return {
        ...chartTheme.value,
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'cross' }
        },
        grid: { left: '5%', right: '5%', bottom: '10%', top: '5%' },
        toolbox: {
            feature: {
                saveAsImage: {},
                dataZoom: { yAxisIndex: 'none' }
            }
        },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: timestamps,
            axisLabel: { color: isDark.value ? '#ffffff' : '#333333' }
        },
        yAxis: {
            type: 'value',
            axisLabel: { color: isDark.value ? '#ffffff' : '#333333' },
            scale: true,
            splitNumber: 5
        }, series: [
            {
                name: t('pages.metrics.routesReceivedIPv6'),
                type: 'line',
                smooth: true,
                symbol: 'circle',
                symbolSize: 6,
                lineStyle: { width: 3 },
                areaStyle: {
                    opacity: 0.3,
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: 'rgba(250, 173, 20, 0.3)' },
                            { offset: 1, color: 'rgba(250, 173, 20, 0.1)' }
                        ]
                    }
                },
                data: routesReceived,
                itemStyle: { color: '#faad14' }
            }
        ]
    }
})

const bgpIPv6AdvertisedOption = computed(() => {
    if (!sessionMetrics.value?.bgp || sessionMetrics.value.bgp.length === 0) return {}

    // Find the IPv6 BGP session using type-based filtering and meaningful data check
    const ipv6Session = sessionMetrics.value.bgp.find(session => {
        // Only show IPv6 charts for MP-BGP sessions or explicit IPv6 sessions
        const isValidForIPv6 = session.type === 'mpbgp' || session.type === 'ipv6' || session.type === ''
        const hasMetrics = session.routes?.ipv6?.exported?.metric && session.routes.ipv6.exported.metric.length > 0
        return isValidForIPv6 && hasMetrics
    })

    if (!ipv6Session?.routes?.ipv6?.exported?.metric) return {}

    // Extract timestamps and route counts for IPv6 advertised routes
    const timestamps: string[] = []
    const routesAdvertised: number[] = []
    ipv6Session.routes.ipv6.exported.metric.forEach(([timestamp, value]: [number, number]) => {
        timestamps.push(new Date(timestamp * 1000).toLocaleString())
        routesAdvertised.push(value)
    })

    return {
        ...chartTheme.value,
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'cross' }
        },
        grid: { left: '5%', right: '5%', bottom: '10%', top: '5%' },
        toolbox: {
            feature: {
                saveAsImage: {},
                dataZoom: { yAxisIndex: 'none' }
            }
        },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: timestamps,
            axisLabel: { color: isDark.value ? '#ffffff' : '#333333' }
        },
        yAxis: {
            type: 'value',
            axisLabel: { color: isDark.value ? '#ffffff' : '#333333' },
            scale: true,
            splitNumber: 5
        }, series: [
            {
                name: t('pages.metrics.routesAdvertisedIPv6'),
                type: 'line',
                smooth: true,
                symbol: 'circle',
                symbolSize: 6,
                lineStyle: { width: 3 },
                areaStyle: {
                    opacity: 0.3,
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: 'rgba(255, 135, 135, 0.3)' },
                            { offset: 1, color: 'rgba(255, 135, 135, 0.1)' }
                        ]
                    }
                },
                data: routesAdvertised,
                itemStyle: { color: '#ff8787' }
            }
        ]
    }
})

const interfaceMetricsOption = computed(() => {
    if (!sessionMetrics.value?.interface?.traffic?.metric) return {}

    const trafficData = sessionMetrics.value.interface.traffic
    const timestamps: string[] = []
    const rxBytes: number[] = []
    const txBytes: number[] = []    // Extract data from traffic metrics array [timestamp, Tx, Rx]
    trafficData.metric.forEach(([timestamp, tx, rx]: [number, number, number]) => {
        timestamps.push(new Date(timestamp * 1000).toLocaleString())
        // TX is positive (above x-axis), RX is negative (below x-axis)
        txBytes.push(tx)
        rxBytes.push(-rx)
    })

    return {
        ...chartTheme.value,
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'cross' }, formatter: (params: any) => {
                let tooltipText = `<div style="margin: 0px 0 0;line-height:1;">${params[0].axisValue}</div>`
                params.forEach((param: any) => {
                    const value = Math.abs(param.value) // Show absolute value in tooltip
                    const formattedValue = formatBytes(value)
                    const color = param.color
                    const name = param.seriesName
                    tooltipText += `<div style="margin: 5px 0 0;line-height:1;"><span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:${color};"></span>${name}: ${formattedValue}/s</div>`
                })
                return tooltipText
            }
        },
        grid: { left: '5%', right: '5%', bottom: '10%', top: '15%' },
        toolbox: {
            feature: {
                saveAsImage: {},
                dataZoom: { yAxisIndex: 'none' }
            }
        },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: timestamps,
            axisLabel: { color: isDark.value ? '#ffffff' : '#333333' }
        }, yAxis: {
            type: 'value',
            axisLabel: {
                color: isDark.value ? '#ffffff' : '#333333',
                formatter: (value: number) => {
                    const absValue = Math.abs(value)
                    if (absValue === 0) return '0'
                    if (absValue < 1024) return `${absValue.toFixed(0)}B/s`
                    if (absValue < 1024 * 1024) return `${(absValue / 1024).toFixed(0)}KB/s`
                    if (absValue < 1024 * 1024 * 1024) return `${(absValue / (1024 * 1024)).toFixed(1)}MB/s`
                    return `${(absValue / (1024 * 1024 * 1024)).toFixed(2)}GB/s`
                }
            },
            splitLine: {
                lineStyle: {
                    color: isDark.value ? '#444444' : '#e8e8e8'
                }
            },
            splitNumber: 6
        }, series: [
            {
                name: 'TX',
                type: 'line',
                smooth: true,
                symbol: 'circle',
                symbolSize: 4,
                lineStyle: { width: 2 },
                areaStyle: {
                    opacity: 0.4,
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: '#1890ff' },
                            { offset: 1, color: 'rgba(24, 144, 255, 0.1)' }
                        ]
                    }
                },
                data: txBytes,
                itemStyle: { color: '#1890ff' }
            },
            {
                name: 'RX',
                type: 'line',
                smooth: true,
                symbol: 'circle',
                symbolSize: 4,
                lineStyle: { width: 2 },
                areaStyle: {
                    opacity: 0.4,
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: 'rgba(255, 77, 79, 0.1)' },
                            { offset: 1, color: '#ff4d4f' }
                        ]
                    }
                },
                data: rxBytes,
                itemStyle: { color: '#ff4d4f' }
            }
        ]
    }
})

const rttMetricsOption = computed(() => {
    if (!sessionMetrics.value?.rtt?.metric) return {}

    const timestamps: string[] = []
    const rttValues: number[] = []

    sessionMetrics.value.rtt.metric.forEach(([timestamp, value]: [number, number]) => {
        timestamps.push(new Date(timestamp * 1000).toLocaleString())
        rttValues.push(value)
    })
    return {
        ...chartTheme.value,
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'cross' },
            formatter: (params: any) => {
                let html = `${params[0].axisValue}<br/>`
                params.forEach((item: any) => {
                    const value = item.value
                    const unit = 'ms'
                    html += `${item.marker} ${item.seriesName}: ${value === -1 ? t('pages.metrics.timeout') : value + unit}<br/>`
                })
                return html
            }
        },
        grid: { left: '5%', right: '5%', bottom: '10%', top: '15%' },
        toolbox: {
            feature: {
                saveAsImage: {},
                dataZoom: { yAxisIndex: 'none' }
            }
        },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: timestamps,
            axisLabel: { color: isDark.value ? '#ffffff' : '#333333' }
        },
        yAxis: {
            type: 'value',
            name: t('pages.metrics.rtt') + ' (ms)',
            axisLabel: { color: isDark.value ? '#ffffff' : '#333333' },
            scale: true,
            splitNumber: 5
        },
        series: [
            {
                name: t('pages.metrics.rtt'),
                type: 'line',
                smooth: true,
                data: rttValues,
                itemStyle: { color: '#722ed1' }
            }
        ]
    }
})

// =============================================================================
// TABLE COLUMNS CONFIGURATION
// =============================================================================
// Helper function to check if a field has meaningful data
const hasData = (field: string, data: any) => {
    if (!data) return false
    const value = data[field]
    return value !== null && value !== undefined && value !== '' && value !== 0
}

// Table headers for v-data-table
const interfaceHeaders = computed(() => {
    const allHeaders = [
        {
            title: t('pages.metrics.interfaceIPv4'),
            key: 'ipv4',
            width: 120,
        },
        {
            title: t('pages.metrics.interfaceIPv6'),
            key: 'ipv6',
            width: 150,
        },
        {
            title: t('pages.metrics.interfaceIPv6LinkLocal'),
            key: 'ipv6LinkLocal',
            width: 180,
        },
        {
            title: t('pages.metrics.interfaceMTU'),
            key: 'mtu',
            width: 80
        },
        {
            title: t('pages.metrics.interfaceStatus'),
            key: 'status',
            width: 100
        },
        {
            title: t('pages.metrics.currentRates'),
            key: 'currentRates',
            width: 200,
            sortable: false
        }
    ]

    // Filter headers based on available data
    const interfaceData = getLatestMetrics.value?.interface
    if (!interfaceData) return allHeaders

    return allHeaders.filter(header => {
        // Always include headers without a direct data field (like currentRates)
        if (header.key === 'currentRates') {
            return true
        }

        // For headers with a key, check if the field has meaningful data
        return hasData(header.key, interfaceData)
    })
})

const bgpHeaders = computed(() => [
    {
        title: t('pages.metrics.bgpPeerName'),
        key: 'name',
        width: 150,
    },
    {
        title: t('pages.metrics.bgpState'),
        key: 'state',
        width: 100
    },
    {
        title: t('pages.metrics.bgpSince'),
        key: 'since',
        width: 160,
    },
    {
        title: t('pages.metrics.bgpSession'),
        key: 'info',
        width: 200,
    },
    {
        title: t('pages.metrics.routesReceivedIPv4'),
        key: 'routes.ipv4.imported.current',
        width: 140,
        sortable: false
    },
    {
        title: t('pages.metrics.routesAdvertisedIPv4'),
        key: 'routes.ipv4.exported.current',
        width: 140,
        sortable: false
    },
    {
        title: t('pages.metrics.routesReceivedIPv6'),
        key: 'routes.ipv6.imported.current',
        width: 140,
        sortable: false
    },
    {
        title: t('pages.metrics.routesAdvertisedIPv6'),
        key: 'routes.ipv6.exported.current',
        width: 140,
        sortable: false
    }
])
</script>
