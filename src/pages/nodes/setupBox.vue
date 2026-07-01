<!--
*******************************************************************
pages/nodes/setupBox.vue

Copyright (C) 2024 iEdon
Copyright (C) 2026 Luochancy

This file is part of a project derived from iedon-net-frontend.
Modified by Luochancy on 2026-06.

Licensed under the GNU General Public License v3.0.
See the LICENSE file in the project root for details.
*******************************************************************
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterInfoResponse, RouterMetadata, RoutingPolicy } from '../../common/packetHandler'
import PeerInfoCard from './peerInfoCard.vue'

const t = useI18n().t

// This step is reserved for further extension.
// Currently used to summary information.

const props = defineProps<{
    nextStep: Function,
    prevStep: Function,
    router: RouterMetadata,
    routerInfo: RouterInfoResponse | null,
    loading: boolean,
    preferenceForm: {
        linkType: string,
        bgpExtensions: ("mp-bgp" | "extended-nexthop")[],
        routingPolicy: number
    },
    interfaceForm: {
        useIpv4: boolean,
        ipv4: string,
        useIpv6: boolean,
        ipv6: string,
        useIpv6LinkLocal: boolean,
        ipv6LinkLocal: string,
        endpoint: string,
        credential: string,
        mtu: number
    }
}>()

const interfaceForm = computed(() => {
    const result = {}
    for (const key in props.interfaceForm) {
        const data: string | boolean | number = props.interfaceForm[key as keyof typeof props.interfaceForm]
        if ((typeof data === 'string' && data !== '') || (typeof data !== 'string' && !data) || (typeof data === 'number' && data && !isNaN(data)) ) Object.assign(result, {
            [key]: data
        })
    }
    return result
})

const preferenceForm = computed(() => {
    const result = {}
    for (const key in props.preferenceForm) {
        const data: string | ("mp-bgp" | "extended-nexthop")[] | number = props.preferenceForm[key as keyof typeof props.preferenceForm]
        if (key !== 'asn') Object.assign(result, { [key]: data })
    }
    return result
})

const loading = computed(() => props.loading)

// Function to get routing policy name from numeric value
const getRoutingPolicyName = (value: number): string => {
    return RoutingPolicy[value] || 'FULL'
}
</script>

<template>
    <div class="setup-box-wrapper">
        <v-overlay :model-value="loading" contained class="align-center justify-center">
            <v-progress-circular indeterminate color="primary" size="64" />
        </v-overlay>

        <div class="section-label text-center mb-4">{{ t('pages.peering.step3Introduction') }}</div>

        <!-- Preference Summary -->
        <div class="summary-card mb-4">
            <div class="section-label mb-3">{{ t('pages.peering.step1') }}</div>
            <div v-for="(data, key) in preferenceForm" :key="`preferenceForm_${key}`" class="kv-row">
                <span class="kv-key">{{ t(`pages.peering.${String(key)}`) }}</span>
                <span class="kv-value">
                    <template v-if="key === 'linkType'">
                        {{ t(`pages.peering.${String(data)}`) }}
                    </template>
                    <template v-else-if="key === 'bgpExtensions' && Array.isArray(data)">
                        <v-chip v-for="item in data" :key="item" size="small" rounded="lg" variant="tonal" color="primary" class="mr-1">{{ t(`pages.peering.${String(item)}`) }}</v-chip>
                    </template>
                    <template v-else-if="key === 'routingPolicy'">
                        {{ t(`pages.peering.routingPolicyTypes.${getRoutingPolicyName(data as number)}`) }}
                    </template>
                    <template v-else>
                        {{ data }}
                    </template>
                </span>
            </div>
        </div>

        <!-- Interface Summary -->
        <div class="summary-card mb-4">
            <div class="section-label mb-3">{{ t('pages.peering.step2') }}</div>
            <div v-for="(data, key) in interfaceForm" :key="`interfaceForm_${key}`" class="kv-row">
                <span class="kv-key">{{ t(`pages.peering.${String(key)}`) }}</span>
                <span class="kv-value">
                    <template v-if="typeof data === 'boolean'">
                        <v-icon v-if="data" color="success" size="small" class="mr-1">mdi-check-circle</v-icon>
                        <v-icon v-else color="error" size="small" class="mr-1">mdi-close-circle</v-icon>
                        <span class="text-medium-emphasis">{{ data ? t('common.yes') : t('common.no') }}</span>
                    </template>
                    <template v-else>
                        {{ data }}
                    </template>
                </span>
            </div>
        </div>

        <peer-info-card :router="props.router" :router-info="props.routerInfo"></peer-info-card>
        <div class="d-flex justify-center mt-6 ga-3">
            <v-btn variant="outlined" rounded="xl" @click="props.prevStep()">{{ t('pages.peering.back') }}</v-btn>
            <v-btn color="primary" prepend-icon="mdi-send" rounded="pill" @click="props.nextStep()">
                {{ t('pages.signIn.continue') }}
            </v-btn>
        </div>
    </div>
</template>

<style scoped>
/* ============================================================
   Setup Box Wrapper
   ============================================================ */
.setup-box-wrapper {
    position: relative;
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
}

/* ============================================================
   Summary Card
   ============================================================ */
.summary-card {
    background: rgba(var(--v-theme-surface-variant), 0.35);
    border-radius: 12px;
    padding: 16px;
}

/* ============================================================
   KV Row
   ============================================================ */
.kv-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid rgba(var(--v-border-color), 0.08);
}

.kv-row:last-child {
    border-bottom: none;
}

.kv-key {
    font-size: 13px;
    font-weight: 500;
    color: rgb(var(--v-theme-on-surface-variant));
    white-space: nowrap;
    flex-shrink: 0;
    min-width: 120px;
}

.kv-value {
    font-size: 14px;
    color: rgb(var(--v-theme-on-surface));
    text-align: right;
    word-break: break-all;
}
</style>