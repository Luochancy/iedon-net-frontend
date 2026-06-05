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
        <h2 class="text-h6 text-center mb-4 font-weight-medium">{{ t('pages.peering.step3Introduction') }}</h2>
        <v-card rounded="xl" variant="tonal" class="mb-4">
        <v-table density="comfortable" class="summary-table">
            <tbody>
                <template v-for="(data, key) in preferenceForm" :key="`preferenceForm_${key}`">
                    <tr>
                        <td class="text-subtitle-2 font-weight-medium text-medium-emphasis" style="white-space: nowrap;">{{ t(`pages.peering.${String(key)}`) }}</td>
                        <td>
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
                        </td>
                    </tr>
                </template>
                <template v-for="(data, key) in interfaceForm" :key="`interfaceForm_${key}`">
                    <tr>
                        <td class="text-subtitle-2 font-weight-medium text-medium-emphasis" style="white-space: nowrap;">{{ t(`pages.peering.${String(key)}`) }}</td>
                        <td>
                            <template v-if="typeof data === 'boolean'">
                                <v-icon v-if="data" color="success" size="small">mdi-check-circle</v-icon>
                                <v-icon v-else color="error" size="small">mdi-close-circle</v-icon>
                            </template>
                            <template v-else>
                                {{ data }}
                            </template>
                        </td>
                    </tr>
                </template>
            </tbody>
        </v-table>
        </v-card>
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
.summary-table {
    border-radius: 12px;
}
</style>