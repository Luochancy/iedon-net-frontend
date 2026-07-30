<!--
*******************************************************************
pages/manage/sessionMetrics.vue

Copyright (C) 2024 iEdon
Copyright (C) 2026 Luochancy

This file is part of a project derived from iedon-net-frontend.
Modified by Luochancy on 2026-06.

Licensed under the GNU General Public License v3.0.
See the LICENSE file in the project root for details.
*******************************************************************
-->
<script setup lang="ts">
import { onMounted, onUnmounted, Ref, ref, computed, nextTick, watchEffect } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { VChart } from '../../components/EChartsLoader'

import {
    loggedIn, formatDate, formatRelativeTime, themeName, isAdmin, formatBytes,
    registerPageTitle, deriveProbeStatuses, showSnackbar
} from '../../common/helper'
import type { ProbeStatusKey } from '../../common/helper'
import {
    makeRequest, SessionMetric, RouterMetadata, RoutersResponse, CurrentSessionMetadata,
    GetCurrentSessionResponse, RoutingPolicy, SessionStatus, BGPMetric
} from '../../common/packetHandler'
import RouterLocationAvatar from '../../components/RouterLocationAvatar.vue'
import config from '../../config'

//@ts-ignore
import markdown_it from 'markdown-it'
//@ts-ignore
import mila from 'markdown-it-link-attributes'

// Raw HTML passthrough stays off: the rendered result is fed to v-html and the
// project ships no sanitiser.
const md = new markdown_it()
md.use(mila, { attrs: { target: '_blank' } })

const { t } = useI18n()
const router = useRouter()
const route = useRoute()

// =============================================================================
// STATE
// =============================================================================
const loading = ref(true)
const sessionId = route.params.sessionId as string
const routerId = route.params.routerId as string

const sessionMetrics: Ref<SessionMetric | null> = ref(null)
const routerInfo: Ref<RouterMetadata | null> = ref(null)
const sessionMetadata: Ref<CurrentSessionMetadata | null> = ref(null)

const cardRef = ref<HTMLElement>()
const detailsSection = ref<HTMLElement>()
const rttChartSection = ref<HTMLElement>()
const bgpChartsSection = ref<HTMLElement>()
const interfaceChartSection = ref<HTMLElement>()
const activeTabKey = ref('interface-details')

const countdownSeconds = ref(0)
let countdownInterval: number | null = null

const codeClickHandlers = new Map<HTMLElement, () => void>()

// Single dialog drives every destructive action instead of one dialog each.
const confirmOpen = ref(false)
const confirmAction = ref<(() => void) | null>(null)
const askConfirm = (action: () => void) => {
    confirmAction.value = action
    confirmOpen.value = true
}
const runConfirm = () => {
    confirmAction.value?.()
    confirmOpen.value = false
}

// =============================================================================
// DERIVED DATA
// =============================================================================
const isDark = computed(() => themeName.value === 'dark')

const BGP_TYPE_MATCHES = (type: string | undefined, family: 'ipv4' | 'ipv6') =>
    type === 'mpbgp' || type === family || type === ''

const getLatestMetrics = computed(() => {
    if (!sessionMetrics.value) return null

    let bgpData = null
    const sessions = sessionMetrics.value.bgp
    if (sessions && sessions.length > 0) {
        const pick = (family: 'ipv4' | 'ipv6') => sessions.find(s =>
            BGP_TYPE_MATCHES(s.type, family) &&
            ((s.routes?.[family]?.imported?.current ?? 0) > 0 || (s.routes?.[family]?.exported?.current ?? 0) > 0)
        )
        const v4 = pick('ipv4')
        const v6 = pick('ipv6')
        bgpData = {
            routes: {
                ipv4: {
                    imported: { current: v4?.routes?.ipv4?.imported?.current || 0 },
                    exported: { current: v4?.routes?.ipv4?.exported?.current || 0 },
                },
                ipv6: {
                    imported: { current: v6?.routes?.ipv6?.imported?.current || 0 },
                    exported: { current: v6?.routes?.ipv6?.exported?.current || 0 },
                },
            },
        }
    }

    return {
        bgp: bgpData,
        interface: sessionMetrics.value.interface || null,
        rtt: sessionMetrics.value.rtt || null,
    }
})

const rttDisplayValue = computed(() => {
    const v = getLatestMetrics.value?.rtt?.current
    if (v === undefined || v === null) return '0'
    if (v === -1) return t('pages.metrics.timeout')
    return v.toString()
})

const rttIsTimeout = computed(() => rttDisplayValue.value === t('pages.metrics.timeout'))

const rttLossDisplayValue = computed(() => {
    const loss = getLatestMetrics.value?.rtt?.loss
    if (loss === undefined || loss === null) return '0.0'
    return (loss * 100).toFixed(1)
})

const countdownDisplay = computed(() => {
    const total = countdownSeconds.value
    if (total <= 0) return '00:00:00'
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`
})

const sessionInfo = computed(() => {
    const data = sessionMetrics.value?.data
    if (!data || typeof data === 'string') return null
    const raw = data.info
    if (!raw) return null
    return { raw, parsed: md.render(raw) }
})

const hasData = (field: string, data: any) => {
    if (!data) return false
    const value = data[field]
    return value !== null && value !== undefined && value !== '' && value !== 0
}

const hasAnyInterfaceData = computed(() => {
    const iface = getLatestMetrics.value?.interface
    if (!iface) return false
    const basic = ['ipv4', 'ipv6', 'ipv6LinkLocal', 'mtu', 'status'].some(f => hasData(f, iface))
    const traffic = !!iface.traffic?.current && (iface.traffic.current[0] > 0 || iface.traffic.current[1] > 0)
    return basic || traffic
})

const hasAnyBgpData = computed(() => !!sessionMetrics.value?.bgp?.length)

const PROBE_STATUS_COLORS: Record<ProbeStatusKey, string> = {
    testedOk: '#52c41a',
    noRouting: '#ff4d4f',
    nat: '#faad14',
    notAvailable: '#d9d9d9',
}

const probeStatusDisplay = computed(() => {
    if (!sessionMetadata.value) return []
    return deriveProbeStatuses(sessionMetadata.value.probe || null).map(status => ({
        ...status,
        label: t(`pages.metrics.probeStatus.labels.${status.key}`),
        description: t(`pages.metrics.probeStatus.descriptions.${status.key}`),
        color: PROBE_STATUS_COLORS[status.key],
    }))
})

// =============================================================================
// INFO FIELDS - described as data, rendered by one v-for
// =============================================================================
interface InfoField {
    label: string
    value?: string
    pair?: { server: string; user: string }
    copy?: string
    title?: string
    mono?: boolean
    full?: boolean
}

const getRoutingPolicyName = (policy: RoutingPolicy) => ({
    [RoutingPolicy.FULL]: t('pages.peering.routingPolicyTypes.FULL'),
    [RoutingPolicy.TRANSIT]: t('pages.peering.routingPolicyTypes.TRANSIT'),
    [RoutingPolicy.PEER]: t('pages.peering.routingPolicyTypes.PEER'),
    [RoutingPolicy.DOWNSTREAM]: t('pages.peering.routingPolicyTypes.DOWNSTREAM'),
    [RoutingPolicy.UPSTREAM]: t('pages.peering.routingPolicyTypes.UPSTREAM'),
}[policy] || t('pages.metrics.unknown'))

const formatBgpExtensions = (extensions: string[]) => {
    if (!extensions || extensions.length === 0) return t('pages.metrics.none')
    return extensions.map(ext => {
        const key = `pages.peering.${ext}`
        const translated = t(key)
        return translated !== key ? translated : ext
    }).join(', ')
}

const sessionFields = computed<InfoField[]>(() => {
    const meta = sessionMetadata.value
    if (!meta) return []

    const metricsTimestamp = sessionMetrics.value
        ? new Date(sessionMetrics.value.timestamp * 1000 || Date.now()).toISOString()
        : null

    const fields: InfoField[] = [
        { label: t('pages.metrics.sessionId'), value: sessionId, copy: sessionId, mono: true, full: true },
        { label: t('pages.manage.session.asn'), value: String(meta.asn) },
        { label: t('pages.metrics.interaceType'), value: t(`pages.peering.${meta.type}`) },
        {
            label: t('pages.metrics.interfaceName'),
            value: meta.interface || t('pages.metrics.notAvailable'),
            copy: meta.interface || '',
            mono: true,
        },
    ]

    if (meta.mtu) fields.push({ label: t('pages.metrics.mtu'), value: String(meta.mtu) })
    fields.push({ label: t('pages.metrics.routingPolicy'), value: getRoutingPolicyName(meta.policy) })
    if (meta.extensions) {
        fields.push({ label: t('pages.metrics.bgpExtensions'), value: formatBgpExtensions(meta.extensions) })
    }

    fields.push(
        {
            label: t('pages.metrics.createdAt'),
            value: formatRelativeTime(meta.createdAt, t),
            title: formatDate(meta.createdAt),
        },
        {
            label: t('pages.metrics.updatedAt'),
            value: formatRelativeTime(meta.updatedAt, t),
            title: formatDate(meta.updatedAt),
        },
        {
            label: t('pages.metrics.lastUpdated'),
            value: metricsTimestamp ? formatRelativeTime(metricsTimestamp, t) : t('pages.metrics.loading'),
            title: metricsTimestamp ? formatDate(metricsTimestamp) : '',
        },
    )

    return fields
})

const makeIpField = (label: string, serverIp?: string | null, userIp?: string | null): InfoField | null => {
    const server = serverIp || ''
    const user = userIp || ''
    if (!server && !user) return null
    if (server && user) {
        return { label, pair: { server, user }, copy: `${server} ↔ ${user}`, mono: true, full: true }
    }
    return { label, value: server || user, copy: server || user, mono: true }
}

const networkFields = computed<InfoField[]>(() => {
    const r = routerInfo.value
    const m = sessionMetadata.value
    return [
        makeIpField(t('pages.metrics.ipv4Address'), r?.ipv4, m?.ipv4),
        makeIpField(t('pages.metrics.ipv6Address'), r?.ipv6, m?.ipv6),
        makeIpField(t('pages.metrics.ipv6LinkLocal'), r?.ipv6LinkLocal, m?.ipv6LinkLocal),
    ].filter((f): f is InfoField => f !== null)
})

const KNOWN_BGP_STATES = new Set([
    'Close', 'Established', 'Idle', 'Active', 'Connect',
    'Open', 'OpenSent', 'OpenConfirm', 'Error', 'No', 'Unknown',
])

// BIRD reports states we hold no translation for; vue-i18n would otherwise
// render the lookup key verbatim.
const bgpStateOf = (info?: string) => {
    const word = (info || '').trim().split(/\s+/)[0].replace(/[^A-Za-z]+$/, '')
    return KNOWN_BGP_STATES.has(word) ? word : 'Unknown'
}

// =============================================================================
// STAT STRIP
//
// One compact row answering "is this session healthy, and how much is it
// moving?" before any configuration detail. Paired values (in/out, tx/rx) live
// in a single stat instead of a card each, so seven numbers read at a glance
// rather than filling six equally-weighted tiles.
// =============================================================================
interface Stat {
    key: string
    label: string
    value: string
    unit?: string
    /** Secondary half of a paired reading, e.g. the "out" of an in/out figure. */
    alt?: string
    altUnit?: string
    tone?: 'success' | 'error'
    onClick?: () => void
}

const stats = computed<Stat[]>(() => {
    const m = getLatestMetrics.value
    if (!m) return []

    const list: Stat[] = []

    // Health first: BGP state per session, then latency.
    for (const [index, s] of (sessionMetrics.value?.bgp || []).entries()) {
        const name = s.name?.toLowerCase() || ''
        const family = name.includes('v4') ? 'IPv4' : name.includes('v6') ? 'IPv6' : s.name ? 'MP-BGP' : ''
        const established = !!s.info?.includes('Established')
        list.push({
            key: `bgp-state-${index}`,
            label: family ? `${t('pages.metrics.bgpSession')} · ${family}` : t('pages.metrics.bgpSession'),
            value: t(`pages.metrics.bgpStatus['${bgpStateOf(s.info)}']`),
            tone: established ? 'success' : (s.info && s.info !== 'Unknown' ? 'error' : undefined),
            onClick: scrollToBgpDetails,
        })
    }

    list.push({
        key: 'rtt',
        label: t('pages.metrics.currentRtt'),
        value: rttDisplayValue.value,
        unit: rttIsTimeout.value ? undefined : 'ms',
        tone: rttIsTimeout.value ? 'error' : undefined,
        onClick: scrollToRttChart,
    })

    list.push({
        key: 'loss',
        label: t('pages.metrics.packetLoss'),
        value: rttLossDisplayValue.value,
        unit: '%',
        tone: Number(rttLossDisplayValue.value) > 0 ? 'error' : undefined,
        onClick: scrollToRttChart,
    })

    // Then throughput.
    list.push(
        {
            key: 'routes-v4',
            label: `${t('pages.metrics.interfaceIPv4')} · ${t('pages.metrics.routes')}`,
            value: String(m.bgp?.routes?.ipv4?.imported?.current ?? 0),
            alt: String(m.bgp?.routes?.ipv4?.exported?.current ?? 0),
            onClick: scrollToBgpCharts,
        },
        {
            key: 'routes-v6',
            label: `${t('pages.metrics.interfaceIPv6')} · ${t('pages.metrics.routes')}`,
            value: String(m.bgp?.routes?.ipv6?.imported?.current ?? 0),
            alt: String(m.bgp?.routes?.ipv6?.exported?.current ?? 0),
            onClick: scrollToBgpCharts,
        },
        {
            key: 'traffic-current',
            label: t('pages.metrics.currentRates'),
            value: formatBytes(m.interface?.traffic?.current?.[1] || 0),
            unit: '/s',
            alt: formatBytes(m.interface?.traffic?.current?.[0] || 0),
            altUnit: '/s',
            onClick: scrollToInterfaceChart,
        },
        {
            key: 'traffic-total',
            label: t('pages.metrics.trafficTotal'),
            value: formatBytes(m.interface?.traffic?.total?.[1] || 0),
            alt: formatBytes(m.interface?.traffic?.total?.[0] || 0),
            onClick: scrollToInterfaceChart,
        },
    )

    return list
})

// =============================================================================
// CHARTS - one builder, four configurations
// =============================================================================
const chartInk = computed(() => (isDark.value ? '#ffffff' : '#333333'))

const chartBase = computed(() => ({
    // Transparent so the surrounding card provides the surface colour in both themes.
    backgroundColor: 'transparent',
    textStyle: { color: chartInk.value },
    grid: { left: '5%', right: '5%', bottom: '10%', top: '12%' },
    toolbox: { feature: { saveAsImage: {}, dataZoom: { yAxisIndex: 'none' } } },
}))

const timeAxis = (timestamps: string[]) => ({
    type: 'category',
    boundaryGap: false,
    data: timestamps,
    axisLabel: { color: chartInk.value },
})

const gradient = (from: string, to: string) => ({
    type: 'linear',
    x: 0, y: 0, x2: 0, y2: 1,
    colorStops: [{ offset: 0, color: from }, { offset: 1, color: to }],
})

interface BgpChartSpec {
    key: string
    family: 'ipv4' | 'ipv6'
    dir: 'imported' | 'exported'
    color: string
    fade: string
    titleKey: string
}

const BGP_CHART_SPECS: BgpChartSpec[] = [
    { key: 'v4-in', family: 'ipv4', dir: 'imported', color: '#52c41a', fade: 'rgba(82, 196, 26, 0.1)', titleKey: 'routesReceivedIPv4' },
    { key: 'v4-out', family: 'ipv4', dir: 'exported', color: '#1890ff', fade: 'rgba(24, 144, 255, 0.1)', titleKey: 'routesAdvertisedIPv4' },
    { key: 'v6-in', family: 'ipv6', dir: 'imported', color: '#faad14', fade: 'rgba(250, 173, 20, 0.1)', titleKey: 'routesReceivedIPv6' },
    { key: 'v6-out', family: 'ipv6', dir: 'exported', color: '#ff8787', fade: 'rgba(255, 135, 135, 0.1)', titleKey: 'routesAdvertisedIPv6' },
]

const bgpCharts = computed(() => {
    const sessions = sessionMetrics.value?.bgp
    if (!sessions?.length) return []

    return BGP_CHART_SPECS.flatMap(spec => {
        const session = sessions.find(s =>
            BGP_TYPE_MATCHES(s.type, spec.family) &&
            (s.routes?.[spec.family]?.[spec.dir]?.metric?.length ?? 0) > 0
        )
        const metric = session?.routes?.[spec.family]?.[spec.dir]?.metric
        if (!metric?.length) return []

        const title = t(`pages.metrics.${spec.titleKey}`)
        const timestamps = metric.map(([ts]: [number, number]) => new Date(ts * 1000).toLocaleString())
        const values = metric.map(([, v]: [number, number]) => v)

        return [{
            key: spec.key,
            title,
            option: {
                ...chartBase.value,
                tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
                xAxis: timeAxis(timestamps),
                yAxis: { type: 'value', axisLabel: { color: chartInk.value }, scale: true, splitNumber: 5 },
                series: [{
                    name: title,
                    type: 'line',
                    smooth: true,
                    symbol: 'circle',
                    symbolSize: 6,
                    lineStyle: { width: 3 },
                    areaStyle: { opacity: 0.3, color: gradient(spec.color, spec.fade) },
                    data: values,
                    itemStyle: { color: spec.color },
                }],
            },
        }]
    })
})

const hasInterfaceChart = computed(() => !!sessionMetrics.value?.interface?.traffic?.metric?.length)
const hasRttChart = computed(() => !!sessionMetrics.value?.rtt?.metric?.length)

const interfaceMetricsOption = computed(() => {
    const traffic = sessionMetrics.value?.interface?.traffic
    if (!traffic?.metric) return {}

    const timestamps: string[] = []
    const txBytes: number[] = []
    const rxBytes: number[] = []
    // Metric rows are [timestamp, tx, rx]; RX is mirrored below the axis.
    traffic.metric.forEach(([ts, tx, rx]: [number, number, number]) => {
        timestamps.push(new Date(ts * 1000).toLocaleString())
        txBytes.push(tx)
        rxBytes.push(-rx)
    })

    return {
        ...chartBase.value,
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'cross' },
            formatter: (params: any) => {
                let html = `<div style="margin:0;line-height:1;">${params[0].axisValue}</div>`
                params.forEach((p: any) => {
                    html += `<div style="margin:5px 0 0;line-height:1;">` +
                        `<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:${p.color};"></span>` +
                        `${p.seriesName}: ${formatBytes(Math.abs(p.value))}/s</div>`
                })
                return html
            },
        },
        xAxis: timeAxis(timestamps),
        yAxis: {
            type: 'value',
            axisLabel: {
                color: chartInk.value,
                formatter: (value: number) => {
                    const v = Math.abs(value)
                    if (v === 0) return '0'
                    if (v < 1024) return `${v.toFixed(0)}B/s`
                    if (v < 1024 ** 2) return `${(v / 1024).toFixed(0)}KB/s`
                    if (v < 1024 ** 3) return `${(v / 1024 ** 2).toFixed(1)}MB/s`
                    return `${(v / 1024 ** 3).toFixed(2)}GB/s`
                },
            },
            splitLine: { lineStyle: { color: isDark.value ? '#444444' : '#e8e8e8' } },
            splitNumber: 6,
        },
        series: [
            {
                name: 'TX', type: 'line', smooth: true, symbol: 'circle', symbolSize: 4,
                lineStyle: { width: 2 },
                areaStyle: { opacity: 0.4, color: gradient('#1890ff', 'rgba(24, 144, 255, 0.1)') },
                data: txBytes,
                itemStyle: { color: '#1890ff' },
            },
            {
                name: 'RX', type: 'line', smooth: true, symbol: 'circle', symbolSize: 4,
                lineStyle: { width: 2 },
                areaStyle: { opacity: 0.4, color: gradient('rgba(255, 77, 79, 0.1)', '#ff4d4f') },
                data: rxBytes,
                itemStyle: { color: '#ff4d4f' },
            },
        ],
    }
})

const rttMetricsOption = computed(() => {
    const metric = sessionMetrics.value?.rtt?.metric
    if (!metric) return {}

    const timestamps = metric.map(([ts]: [number, number]) => new Date(ts * 1000).toLocaleString())
    const values = metric.map(([, v]: [number, number]) => v)

    return {
        ...chartBase.value,
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'cross' },
            formatter: (params: any) => {
                let html = `${params[0].axisValue}<br/>`
                params.forEach((item: any) => {
                    const shown = item.value === -1 ? t('pages.metrics.timeout') : `${item.value}ms`
                    html += `${item.marker} ${item.seriesName}: ${shown}<br/>`
                })
                return html
            },
        },
        xAxis: timeAxis(timestamps),
        yAxis: {
            type: 'value',
            name: `${t('pages.metrics.rtt')} (ms)`,
            axisLabel: { color: chartInk.value },
            scale: true,
            splitNumber: 5,
        },
        series: [{
            name: t('pages.metrics.rtt'),
            type: 'line',
            smooth: true,
            data: values,
            itemStyle: { color: '#722ed1' },
        }],
    }
})

// =============================================================================
// TABLES
// =============================================================================
const interfaceHeaders = computed(() => {
    const all = [
        { title: t('pages.metrics.interfaceIPv4'), key: 'ipv4', width: 120 },
        { title: t('pages.metrics.interfaceIPv6'), key: 'ipv6', width: 150 },
        { title: t('pages.metrics.interfaceIPv6LinkLocal'), key: 'ipv6LinkLocal', width: 180 },
        { title: t('pages.metrics.interfaceMTU'), key: 'mtu', width: 80 },
        { title: t('pages.metrics.interfaceStatus'), key: 'status', width: 100 },
        { title: t('pages.metrics.currentRates'), key: 'currentRates', width: 200, sortable: false },
    ]
    const iface = getLatestMetrics.value?.interface
    if (!iface) return all
    return all.filter(h => h.key === 'currentRates' || hasData(h.key, iface))
})

const bgpHeaders = computed(() => [
    { title: t('pages.metrics.bgpPeerName'), key: 'name', width: 150 },
    { title: t('pages.metrics.bgpState'), key: 'state', width: 100 },
    { title: t('pages.metrics.bgpSince'), key: 'since', width: 160 },
    { title: t('pages.metrics.bgpSession'), key: 'info', width: 200 },
    { title: t('pages.metrics.routesReceivedIPv4'), key: 'routes.ipv4.imported.current', width: 140, sortable: false },
    { title: t('pages.metrics.routesAdvertisedIPv4'), key: 'routes.ipv4.exported.current', width: 140, sortable: false },
    { title: t('pages.metrics.routesReceivedIPv6'), key: 'routes.ipv6.imported.current', width: 140, sortable: false },
    { title: t('pages.metrics.routesAdvertisedIPv6'), key: 'routes.ipv6.exported.current', width: 140, sortable: false },
])

const formatNumber = (num: number) => new Intl.NumberFormat().format(num)

// =============================================================================
// ACTIONS
// =============================================================================
const scrollToSection = (sectionRef: Ref<HTMLElement | undefined>, tabKey?: string) => {
    if (tabKey) activeTabKey.value = tabKey
    nextTick(() => {
        sectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
}

const scrollToBgpDetails = () => scrollToSection(detailsSection, 'bgp-details')
const scrollToRttChart = () => scrollToSection(rttChartSection)
const scrollToBgpCharts = () => scrollToSection(bgpChartsSection)
const scrollToInterfaceChart = () => scrollToSection(interfaceChartSection)

const copyToClipboard = async (value: string, label: string) => {
    if (!value) return
    try {
        await navigator.clipboard.writeText(value)
        showSnackbar(t('pages.nodes.copied'), 'info')
    } catch (error) {
        console.error(`Failed to copy ${label}:`, error)
    }
}

const goBack = () => router.back()

const getStatusColor = (status: SessionStatus) => ({
    [SessionStatus.ENABLED]: 'success',
    [SessionStatus.DISABLED]: 'info',
    [SessionStatus.PENDING_APPROVAL]: 'warning',
    [SessionStatus.PROBLEM]: 'error',
    [SessionStatus.QUEUED_FOR_SETUP]: 'primary',
    [SessionStatus.QUEUED_FOR_DELETE]: 'error',
    [SessionStatus.TEARDOWN]: 'grey',
    [SessionStatus.DELETED]: 'default',
}[status] || 'default')

const openLookingGlassPage = (item: BGPMetric) => {
    if (item?.name) router.push(`/lg/${routerId}/${encodeURIComponent(item.name)}`)
}

const canToggleOff = computed(() =>
    sessionMetadata.value?.status === SessionStatus.ENABLED ||
    sessionMetadata.value?.status === SessionStatus.PROBLEM)

const canToggleOn = computed(() =>
    sessionMetadata.value?.status === SessionStatus.DISABLED ||
    sessionMetadata.value?.status === SessionStatus.TEARDOWN)

const canEdit = computed(() => {
    const s = sessionMetadata.value?.status
    return s !== undefined &&
        s !== SessionStatus.PENDING_APPROVAL &&
        s !== SessionStatus.QUEUED_FOR_DELETE &&
        s !== SessionStatus.TEARDOWN &&
        s !== SessionStatus.QUEUED_FOR_SETUP
})

// =============================================================================
// DATA
// =============================================================================
const fetchSessionMetrics = async () => {
    try {
        const resp = await makeRequest(t, isAdmin.value ? '/admin' : '/session', {
            action: isAdmin.value ? 'querySession' : 'query',
            session: sessionId,
            router: routerId,
        })
        if (resp.success && resp.response) {
            sessionMetrics.value = resp.response as unknown as SessionMetric
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
            if (Array.isArray(data?.routers)) {
                routerInfo.value = data.routers.find(r => r.uuid === routerId) || null
            }
        }
    } catch (error) {
        console.error(error)
    }
}

const fetchSessionMetadata = async () => {
    try {
        const resp = await makeRequest(t, '/session', { action: 'get', session: sessionId })
        if (resp.success && resp.response) {
            const data = resp.response as unknown as GetCurrentSessionResponse
            if (data?.session) sessionMetadata.value = data.session
        }
    } catch (error) {
        console.error(error)
    }
}

const fetchAll = () => Promise.allSettled([fetchSessionMetrics(), fetchRouterInfo(), fetchSessionMetadata()])

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

const refreshData = async () => {
    try {
        loading.value = true
        await fetchAll()
    } catch (error) {
        console.error(error)
    } finally {
        loading.value = false
    }
    if (canRefreshData()) startCountdownTimer()
}

const stopCountdownTimer = () => {
    if (countdownInterval) {
        clearInterval(countdownInterval)
        countdownInterval = null
    }
}

const startCountdownTimer = () => {
    if (!canRefreshData() || !sessionMetrics.value?.timestamp) return

    const nextUpdate = sessionMetrics.value.timestamp * 1000 + config.metricPageRefreshInterval
    countdownSeconds.value = Math.floor(Math.max(0, nextUpdate - Date.now()) / 1000)

    stopCountdownTimer()
    countdownInterval = setInterval(() => {
        if (countdownSeconds.value > 0) {
            countdownSeconds.value--
        } else {
            stopCountdownTimer()
            refreshData()
        }
    }, 1000)
}

const simpleActionHandler = async (baseAction: 'delete' | 'enable' | 'disable') => {
    if (!sessionMetadata.value) return
    try {
        loading.value = true
        if (isAdmin.value) {
            const adminAction = baseAction === 'delete' ? 'deleteSession'
                : baseAction === 'enable' ? 'enableSession' : 'disableSession'
            await makeRequest(t, '/admin', { action: adminAction, router: routerId, session: sessionId })
        } else {
            await makeRequest(t, '/session', { action: baseAction, router: routerId, session: sessionId })
        }
        await fetchSessionMetadata()
        if (baseAction === 'delete') router.back()
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
    if (sessionMetadata.value) router.push({ path: `/nodes/${routerId}/edit/${sessionId}` })
}

// =============================================================================
// MARKDOWN CODE-BLOCK COPY
// =============================================================================
const cleanupCodeListeners = () => {
    codeClickHandlers.forEach((handler, element) => element.removeEventListener('click', handler))
    codeClickHandlers.clear()
}

const setupCodeListeners = () => {
    if (!cardRef.value) return
    cardRef.value.querySelectorAll('code').forEach(code => {
        const handler = () => copyToClipboard(code.textContent || '', 'code block')
        code.addEventListener('click', handler)
            ; (code as HTMLElement).style.cursor = 'pointer'
        codeClickHandlers.set(code as HTMLElement, handler)
    })
}

const codeBlockWatcher = watchEffect(() => {
    if (sessionInfo.value?.parsed) {
        cleanupCodeListeners()
        nextTick(setupCodeListeners)
    }
})

// =============================================================================
// LIFECYCLE
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

    loading.value = true
    try {
        await fetchAll()
    } finally {
        loading.value = false
    }

    startCountdownTimer()
})

onUnmounted(() => {
    stopCountdownTimer()
    cleanupCodeListeners()
    codeBlockWatcher()
})
</script>

<template>
    <div class="metrics-page">
        <v-container class="page-container">
            <!-- Toolbar -->
            <div class="d-flex align-center flex-wrap ga-2 mb-4">
                <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="goBack">
                    {{ t('pages.metrics.back') }}
                </v-btn>
                <v-spacer />
                <template v-if="sessionMetadata && !loading">
                    <v-btn v-if="canToggleOff" prepend-icon="mdi-pause" @click="askConfirm(handleDisable)">
                        {{ t('pages.manage.session.disable') }}
                    </v-btn>
                    <v-btn v-else-if="canToggleOn" prepend-icon="mdi-play" @click="askConfirm(handleEnable)">
                        {{ t('pages.manage.session.enable') }}
                    </v-btn>
                    <v-btn v-if="canEdit" prepend-icon="mdi-pencil" @click="handleEdit">
                        {{ t('pages.manage.session.edit') }}
                    </v-btn>
                    <v-btn color="error" variant="tonal" prepend-icon="mdi-delete" @click="askConfirm(handleRemove)">
                        {{ t('pages.manage.session.remove') }}
                    </v-btn>
                </template>
                <v-btn color="primary" prepend-icon="mdi-refresh" :loading="loading" @click="refreshData">
                    {{ t('pages.metrics.refresh') }}
                </v-btn>
            </div>

            <!-- Loading -->
            <div v-if="loading" class="d-flex justify-center align-center pa-12">
                <v-progress-circular indeterminate color="primary" size="40" />
            </div>

            <!-- Error -->
            <div v-else-if="!sessionMetrics || !routerInfo" class="text-center pa-12 text-medium-emphasis">
                <v-icon size="64" color="warning" class="mb-4">mdi-alert-circle-outline</v-icon>
                <h2 class="text-h6 mb-2">{{ t('pages.metrics.noMetricsFound') }}</h2>
                <p class="mb-4">{{ t('pages.metrics.noMetricsFoundDesc') }}</p>
                <v-btn color="primary" rounded="pill" @click="goBack">{{ t('pages.metrics.goBack') }}</v-btn>
            </div>

            <template v-else>
                <!-- Session header -->
                <div class="d-flex align-center ga-4 mb-6">
                    <router-location-avatar :router="routerInfo" :hide-peering-dot="true" />
                    <div class="min-width-0">
                        <h1 class="text-h5 font-weight-bold d-flex align-center flex-wrap ga-2">
                            {{ routerInfo.name }}
                            <v-chip v-if="sessionMetadata" :color="getStatusColor(sessionMetadata.status)"
                                size="small" variant="tonal" class="font-weight-medium">
                                {{ t(`pages.manage.session.statusCode['${sessionMetadata.status}']`) }}
                            </v-chip>
                        </h1>
                        <div v-if="routerInfo.description" class="text-body-2 text-medium-emphasis markdown-inline"
                            v-html="md.render(parseI18nContent(routerInfo.description, locale))" />
                    </div>
                </div>

                <v-row>
                    <!-- Session details -->
                    <v-col cols="12" md="6">
                        <v-card rounded="xl" elevation="0" border class="h-100">
                            <v-card-title class="d-flex align-center ga-2 pa-4 pb-0 flex-wrap">
                                <v-icon color="primary">mdi-lan-connect</v-icon>
                                <span class="text-body-1 font-weight-medium">
                                    {{ t('pages.metrics.sessionDetails') }}
                                </span>
                                <v-spacer />
                                <span v-if="countdownSeconds > 0" class="text-caption text-medium-emphasis">
                                    {{ t('pages.metrics.nextUpdate') }}: {{ countdownDisplay }}
                                </span>
                            </v-card-title>
                            <v-card-text class="pa-4">
                                <v-row>
                                    <v-col v-for="field in sessionFields" :key="field.label"
                                        :cols="field.full ? 12 : 6" :sm="field.full ? 12 : 6" :md="field.full ? 12 : 6"
                                        class="py-1">
                                        <div class="text-caption text-medium-emphasis">{{ field.label }}</div>
                                        <div class="text-body-2 mt-1 d-flex align-center ga-1"
                                            :class="{ 'font-mono': field.mono, 'copyable': !!field.copy }"
                                            :title="field.copy ? t('pages.metrics.clickToCopy') : field.title"
                                            @click="field.copy && copyToClipboard(field.copy, field.label)">
                                            <span class="text-truncate">{{ field.value }}</span>
                                            <v-icon v-if="field.copy" size="13" class="copy-hint">mdi-content-copy</v-icon>
                                        </div>
                                    </v-col>
                                </v-row>
                            </v-card-text>
                        </v-card>
                    </v-col>

                    <!-- Network info -->
                    <v-col cols="12" md="6">
                        <v-card rounded="xl" elevation="0" border class="h-100">
                            <v-card-title class="d-flex align-center ga-2 pa-4 pb-0 flex-wrap">
                                <v-icon color="primary">mdi-earth</v-icon>
                                <span class="text-body-1 font-weight-medium">{{ t('pages.metrics.networkInfo') }}</span>
                                <v-spacer />
                                <v-tooltip v-for="status in probeStatusDisplay" :key="`probe-${status.version}`"
                                    :text="status.description">
                                    <template #activator="{ props: tooltipProps }">
                                        <v-chip v-bind="tooltipProps" size="x-small" variant="outlined">
                                            <span class="probe-dot" :style="{ backgroundColor: status.color }" />
                                            {{ status.version === 'ipv4' ? 'V4' : 'V6' }} {{ status.label }}
                                        </v-chip>
                                    </template>
                                </v-tooltip>
                            </v-card-title>
                            <v-card-text class="pa-4">
                                <v-row>
                                    <v-col v-for="field in networkFields" :key="field.label"
                                        :cols="12" :md="field.full ? 12 : 6" class="py-1">
                                        <div class="text-caption text-medium-emphasis">{{ field.label }}</div>
                                        <div class="text-body-2 mt-1 copyable d-flex align-center ga-1 flex-wrap"
                                            :class="{ 'font-mono': field.mono }"
                                            :title="t('pages.metrics.clickToCopy')"
                                            @click="copyToClipboard(field.copy || '', field.label)">
                                            <template v-if="field.pair">
                                                <span>{{ field.pair.server }}</span>
                                                <v-icon size="14" class="text-medium-emphasis">mdi-link</v-icon>
                                                <span>{{ field.pair.user }}</span>
                                            </template>
                                            <span v-else>{{ field.value }}</span>
                                        </div>
                                    </v-col>
                                </v-row>
                                <div v-if="sessionInfo" ref="cardRef" class="mt-3">
                                    <v-divider class="mb-3" />
                                    <div class="markdown-body text-body-2" v-html="sessionInfo.parsed" />
                                </div>
                                <div class="mt-3">
                                    <v-divider class="mb-3" />
                                    <div class="text-caption text-medium-emphasis mb-2">{{ t('pages.metrics.lastError') }}</div>
                                    <v-alert
                                        v-if="sessionMetadata?.lastError"
                                        type="error"
                                        variant="tonal"
                                        density="compact"
                                        rounded="lg"
                                        class="mb-0"
                                    >
                                        {{ sessionMetadata.lastError }}
                                    </v-alert>
                                    <div v-else class="text-body-2 text-medium-emphasis">
                                        {{ t('pages.metrics.noErrors') || 'No errors' }}
                                    </div>
                                </div>
                            </v-card-text>
                        </v-card>
                    </v-col>
                </v-row>

                <!-- Stat strip: current readings, sitting between the session's
                     identity above and the history charts below. -->
                <v-card v-if="stats.length" rounded="xl" elevation="0" border class="mt-6">
                    <div class="stat-strip">
                        <div v-for="stat in stats" :key="stat.key" class="stat"
                            :class="{ 'stat--clickable': !!stat.onClick }" @click="stat.onClick?.()">
                            <div class="stat-label">{{ stat.label }}</div>
                            <div class="stat-value" :class="{ 'stat-value--stacked': !!stat.alt }">
                                <span :class="{
                                    'text-success': stat.tone === 'success',
                                    'text-error': stat.tone === 'error',
                                }">
                                    <v-icon v-if="stat.alt" size="13" class="stat-arrow">mdi-arrow-down</v-icon>{{ stat.value }}<span
                                        v-if="stat.unit" class="stat-unit">{{ stat.unit }}</span>
                                </span>
                                <span v-if="stat.alt" class="stat-alt">
                                    <v-icon size="13" class="stat-arrow">mdi-arrow-up</v-icon>{{ stat.alt }}<span
                                        v-if="stat.altUnit" class="stat-unit">{{ stat.altUnit }}</span>
                                </span>
                            </div>
                        </div>
                    </div>
                </v-card>

                <!-- BGP charts -->
                <div ref="bgpChartsSection" class="mt-8">
                    <h2 class="text-h6 font-weight-medium mb-3">{{ t('pages.metrics.bgpMetrics') }}</h2>
                    <v-row v-if="bgpCharts.length">
                        <v-col v-for="chart in bgpCharts" :key="chart.key" cols="12" lg="6">
                            <v-card rounded="xl" elevation="0" border class="pa-4">
                                <div class="text-body-2 font-weight-medium mb-2">{{ chart.title }}</div>
                                <v-chart :option="chart.option" :style="{ height: '300px', width: '100%' }"
                                    :autoresize="true" />
                            </v-card>
                        </v-col>
                    </v-row>
                    <v-card v-else rounded="xl" elevation="0" border class="empty-card">
                        <v-icon size="40" class="mb-2 text-medium-emphasis">mdi-chart-line</v-icon>
                        <div class="text-body-2 text-medium-emphasis">{{ t('pages.metrics.noData') }}</div>
                    </v-card>
                </div>

                <!-- Interface chart -->
                <div ref="interfaceChartSection" class="mt-8">
                    <h2 class="text-h6 font-weight-medium mb-3">{{ t('pages.metrics.interfaceMetrics') }}</h2>
                    <v-card rounded="xl" elevation="0" border :class="hasInterfaceChart ? 'pa-4' : 'empty-card'">
                        <v-chart v-if="hasInterfaceChart" :option="interfaceMetricsOption"
                            :style="{ height: '350px', width: '100%' }" :autoresize="true" />
                        <template v-else>
                            <v-icon size="40" class="mb-2 text-medium-emphasis">mdi-access-point-network</v-icon>
                            <div class="text-body-2 text-medium-emphasis">{{ t('pages.metrics.noData') }}</div>
                        </template>
                    </v-card>
                </div>

                <!-- RTT chart -->
                <div ref="rttChartSection" class="mt-8">
                    <h2 class="text-h6 font-weight-medium mb-3">{{ t('pages.metrics.networkMetrics') }}</h2>
                    <v-card rounded="xl" elevation="0" border :class="hasRttChart ? 'pa-4' : 'empty-card'">
                        <v-chart v-if="hasRttChart" :option="rttMetricsOption"
                            :style="{ height: '350px', width: '100%' }" :autoresize="true" />
                        <template v-else>
                            <v-icon size="40" class="mb-2 text-medium-emphasis">mdi-earth</v-icon>
                            <div class="text-body-2 text-medium-emphasis">{{ t('pages.metrics.noData') }}</div>
                        </template>
                    </v-card>
                </div>

                <!-- Detail tables -->
                <div ref="detailsSection" class="mt-8">
                    <h2 class="text-h6 font-weight-medium mb-3">{{ t('pages.metrics.detailedMetrics') }}</h2>
                    <v-card rounded="xl" elevation="0" border>
                        <v-tabs v-model="activeTabKey" color="primary" density="comfortable">
                            <v-tab value="interface-details">{{ t('pages.metrics.interfaceDetails') }}</v-tab>
                            <v-tab value="bgp-details">{{ t('pages.metrics.bgpDetails') }}</v-tab>
                        </v-tabs>
                        <v-divider />
                        <v-window v-model="activeTabKey">
                            <v-window-item value="interface-details">
                                <v-data-table v-if="hasAnyInterfaceData" :items="[getLatestMetrics!.interface]"
                                    :headers="interfaceHeaders" :items-per-page="-1" density="compact" hover
                                    class="elevation-0 bg-transparent">
                                    <template #item.currentRates="{ item }">
                                        ↑ {{ formatBytes(item.traffic?.current?.[0] || 0) }}/s,
                                        ↓ {{ formatBytes(item.traffic?.current?.[1] || 0) }}/s
                                    </template>
                                </v-data-table>
                                <div v-else class="empty-card">
                                    <v-icon size="40" class="mb-2 text-medium-emphasis">mdi-table-off</v-icon>
                                    <div class="text-body-2 text-medium-emphasis">{{ t('pages.metrics.noData') }}</div>
                                </div>
                            </v-window-item>
                            <v-window-item value="bgp-details">
                                <v-data-table v-if="hasAnyBgpData" :items="sessionMetrics!.bgp" :headers="bgpHeaders"
                                    :items-per-page="-1" density="compact" hover class="elevation-0 bg-transparent"
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
                                <div v-else class="empty-card">
                                    <v-icon size="40" class="mb-2 text-medium-emphasis">mdi-lan-disconnect</v-icon>
                                    <div class="text-body-2 text-medium-emphasis">{{ t('pages.metrics.noData') }}</div>
                                </div>
                            </v-window-item>
                        </v-window>
                    </v-card>
                </div>
            </template>
        </v-container>

        <!-- One dialog serves every destructive action -->
        <v-dialog v-model="confirmOpen" max-width="400">
            <v-card rounded="xl">
                <v-card-title class="text-body-1 pa-4">{{ t('pages.manage.session.areYouSure') }}</v-card-title>
                <v-card-actions class="pa-4 pt-0">
                    <v-spacer />
                    <v-btn @click="confirmOpen = false">{{ t('common.cancel') }}</v-btn>
                    <v-btn color="primary" @click="runConfirm">{{ t('common.ok') }}</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<style scoped>
.metrics-page {
    min-height: 100vh;
}

.page-container {
    max-width: 1200px;
}

.min-width-0 {
    min-width: 0;
}

.font-mono {
    font-family: 'Roboto Mono', 'SF Mono', 'Fira Code', monospace;
    font-size: 0.9em;
}

/* ---- copyable values ---- */
.copyable {
    cursor: pointer;
}

.copy-hint {
    opacity: 0;
    transition: opacity 0.15s ease;
}

.copyable:hover .copy-hint {
    opacity: 0.6;
}

/* ---- stat strip ----
   Auto-fit keeps every reading on one line for as long as it fits, then wraps
   into even rows, so the strip stays dense on desktop and legible on a phone. */
.stat-strip {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    /* The 1px gap shows the container behind it, drawing separators without
       leaving a dangling border on the last column or row. */
    gap: 1px;
    background: rgba(var(--v-border-color), var(--v-border-opacity));
}

.stat {
    padding: 14px 18px;
    background: rgb(var(--v-theme-surface));
}

.stat--clickable {
    cursor: pointer;
    transition: background-color 0.15s ease;
}

.stat--clickable:hover {
    background: rgba(var(--v-theme-on-surface), 0.04);
}

.stat-label {
    font-size: 11px;
    line-height: 1.4;
    color: rgb(var(--v-theme-on-surface-variant));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.stat-value {
    display: flex;
    align-items: baseline;
    gap: 4px 12px;
    margin-top: 4px;
    font-size: 1.15rem;
    font-weight: 700;
    line-height: 1.3;
    font-variant-numeric: tabular-nums;
}

/* Paired readings always stack. Letting them wrap only when they happen to be
   too wide left some stats one line tall and others two, which read as ragged. */
.stat-value--stacked {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    font-size: 1rem;
}

.stat-alt {
    color: rgb(var(--v-theme-on-surface-variant));
}

.stat-unit {
    margin-left: 2px;
    font-size: 0.7em;
    font-weight: 500;
    color: rgb(var(--v-theme-on-surface-variant));
}

.stat-arrow {
    margin-right: 1px;
    vertical-align: baseline;
    opacity: 0.55;
}

.probe-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 6px;
}

/* ---- empty states ---- */
.empty-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 16px;
    text-align: center;
}

/* ---- rendered markdown ---- */
.markdown-inline :deep(p) {
    margin: 0;
}

.markdown-body :deep(p) {
    margin: 0 0 8px;
}

.markdown-body :deep(p:last-child) {
    margin-bottom: 0;
}

.markdown-body :deep(code) {
    padding: 2px 6px;
    border-radius: 6px;
    background: rgb(var(--v-theme-surface-container-high));
    font-family: 'Roboto Mono', monospace;
    font-size: 0.85em;
}

.markdown-body :deep(pre) {
    padding: 12px;
    border-radius: 10px;
    background: rgb(var(--v-theme-surface-container-high));
    overflow-x: auto;
}

.markdown-body :deep(a) {
    color: rgb(var(--v-theme-primary));
}
</style>
