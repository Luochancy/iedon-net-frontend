<!--
*******************************************************************
pages/nodes/preferenceBox.vue

Copyright (C) 2024 iEdon
Copyright (C) 2026 Luochancy

This file is part of a project derived from iedon-net-frontend.
Modified by Luochancy on 2026-06.

Licensed under the GNU General Public License v3.0.
See the LICENSE file in the project root for details.
*******************************************************************
-->
<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { isAdmin, splitMessageToVNodes } from '../../common/helper'
import { RouterMetadata, RoutingPolicy } from '../../common/packetHandler'


const props = defineProps<{
    router: RouterMetadata,
    nextStep: Function,
    preferenceForm: {
        asn: string,
        linkType: string,
        bgpExtensions: ("mp-bgp" | "extended-nexthop")[],
        routingPolicy: number
    },
    isEditMode?: boolean,
    existingSession?: any,
    reuseExistingConfig?: boolean
}>()

const emit = defineEmits<{
    'update:reuseExistingConfig': [value: boolean]
}>()

const updateReuseConfig = (value: boolean) => {
    emit('update:reuseExistingConfig', value)
}

const t = useI18n().t

const router = useRouter()
const backToTop = () => {
    router.back()
    nextTick(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
}

const ALL_ROUTING_POLICIES: RoutingPolicy[] = [
    RoutingPolicy.FULL,
    RoutingPolicy.TRANSIT,
    RoutingPolicy.PEER,
    RoutingPolicy.DOWNSTREAM,
    RoutingPolicy.UPSTREAM
]

const availablePolicySet = computed(() => {
    const provided = props.router.allowedPolicies
    const fallback = new Set(ALL_ROUTING_POLICIES)
    if (!provided || provided.length === 0) return fallback
    return new Set(provided)
})

const routingPolicyOptions = computed(() => {
    const set = availablePolicySet.value
    return ALL_ROUTING_POLICIES
        .filter(policy => !(policy === RoutingPolicy.UPSTREAM && !isAdmin.value))
        .map(policy => {
            const key = RoutingPolicy[policy]
            return {
                value: policy,
                label: t(`pages.peering.routingPolicyTypes.${key}`),
                description: t(`pages.peering.routingPolicyTypes.${key}_DESC`),
                disabled: !set.has(policy)
            }
        })
})

let routingPolicyWatcherStopHandle: Function | null = null
onMounted(() => {
    routingPolicyWatcherStopHandle = watch(routingPolicyOptions, (options) => {
        const validOption = options.find(option => option.value === props.preferenceForm.routingPolicy && !option.disabled)
        if (validOption) return
        const fallbackOption = options.find(option => !option.disabled)
        if (fallbackOption) {
            props.preferenceForm.routingPolicy = fallbackOption.value
        }
    }, { immediate: true })
    try {
        const urlParams = new URLSearchParams(window.location.search)
        const linkTypeParam = urlParams.get('linkType')
        const matchedLinkType = props.router.linkTypes.find(type => type === linkTypeParam)
        if (matchedLinkType) {
            props.preferenceForm.linkType = matchedLinkType
        }
    } catch (e) {
        console.error('Failed to parse URL parameters', e)
    }
})

onUnmounted(() => {
    if (routingPolicyWatcherStopHandle) {
        routingPolicyWatcherStopHandle()
    }
})
</script>

<template>
    <!-- Info card -->
    <div class="info-card mb-6">
        <span class="text-body-2 text-medium-emphasis">{{ t('pages.peering.step1Introduction') }}</span>
    </div>

    <v-form class="preference-form">
        <v-text-field v-if="isAdmin" v-model="props.preferenceForm.asn" type="number" variant="outlined" rounded="lg" density="comfortable"
            :label="t('pages.peering.asn')" prefix="AS"
            :placeholder="`${t('pages.signIn.pleaseInput')} ${t('pages.peering.asn')}`"
            class="mb-6" />

        <!-- Link Type -->
        <div class="mb-6">
            <div class="section-label mb-3">{{ t('pages.peering.linkType') }}</div>
            <v-radio-group v-model="props.preferenceForm.linkType" inline class="link-type-group">
                <v-radio v-for="linkType in props.router.linkTypes" :key="`linkType_${linkType}`"
                    :value="linkType" :label="t(`pages.peering.${linkType}`)" />
            </v-radio-group>
        </div>

        <!-- BGP Extensions -->
        <div class="mb-6">
            <div class="section-label mb-2">{{ t('pages.peering.bgpExtensions') }}</div>
            <div v-for="extension in props.router.extensions" :key="`extension_${extension}`">
                <v-checkbox v-model="props.preferenceForm.bgpExtensions" :value="extension"
                    :label="t(`pages.peering['${extension}']`)" density="compact" hide-details />
            </div>
        </div>

        <!-- Routing Policy -->
        <div class="mb-6">
            <div class="section-label mb-3">{{ t('pages.peering.routingPolicy') }}</div>
            <v-radio-group v-model="props.preferenceForm.routingPolicy" class="policy-group">
                <div v-for="option in routingPolicyOptions" :key="`policy_${option.value}`"
                    class="policy-card"
                    :class="{ 'policy-card--selected': props.preferenceForm.routingPolicy === option.value, 'policy-card--disabled': option.disabled }">
                    <v-radio :value="option.value" :disabled="option.disabled" class="policy-radio">
                        <template #label>
                            <div class="policy-label-content">
                                <div class="policy-name">{{ option.label }}</div>
                                <div class="policy-description">{{ option.description }}</div>
                            </div>
                        </template>
                    </v-radio>
                </div>
            </v-radio-group>
        </div>

        <!-- Reuse existing config option for edit mode -->
        <div v-if="props.isEditMode && props.existingSession?.type === props.preferenceForm.linkType" class="mb-5">
            <v-checkbox :model-value="props.reuseExistingConfig"
                @update:model-value="(val: boolean | null) => updateReuseConfig(val ?? false)"
                :label="t('pages.peering.reuseExistingConfig')" hide-details />
        </div>

        <div class="d-flex justify-center mt-6 ga-3">
            <v-btn variant="outlined" rounded="xl" @click="backToTop()">{{ t('pages.peering.backTop') }}</v-btn>
            <v-btn color="primary" prepend-icon="mdi-send" rounded="pill" @click="props.nextStep()">
                {{ t('pages.signIn.continue') }}
            </v-btn>
        </div>
    </v-form>
</template>

<style scoped>
.preference-form {
    padding: 0;
}

/* ============================================================
   Info Card (replaces v-alert)
   ============================================================ */
.info-card {
    background: rgba(var(--v-theme-surface-variant), 0.35);
    border-radius: 12px;
    padding: 14px 18px;
    color: rgb(var(--v-theme-on-surface-variant));
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
   Link Type Group
   ============================================================ */
.link-type-group :deep(.v-radio) {
    margin-right: 8px;
}

/* ============================================================
   Policy Cards
   ============================================================ */
.policy-group :deep(.v-input__control) {
    width: 100%;
}

.policy-card {
    background: rgba(var(--v-theme-surface-variant), 0.35);
    border: 1px solid transparent;
    border-radius: 12px;
    padding: 12px 16px;
    margin-bottom: 8px;
    transition: border-color 0.2s ease;
}

.policy-card--selected {
    border-color: rgb(var(--v-theme-primary));
}

.policy-card--disabled {
    opacity: 0.5;
}

.policy-radio {
    width: 100%;
}

.policy-label-content {
    width: 100%;
}

.policy-name {
    font-weight: 600;
    font-size: 14px;
    color: rgb(var(--v-theme-on-surface));
}

.policy-description {
    font-size: 0.9em;
    margin-top: 4px;
    color: rgb(var(--v-theme-on-surface-variant));
    max-width: 500px;
}
</style>