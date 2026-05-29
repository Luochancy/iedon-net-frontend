<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
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
    window.scrollTo(0, 0)
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
    <v-alert type="info" variant="tonal" rounded="lg" class="mb-5" :text="t('pages.peering.step1Introduction')" />
    <v-form class="preference-form">
        <v-text-field v-if="isAdmin" v-model="props.preferenceForm.asn" type="number" variant="outlined" rounded="lg" density="comfortable"
            :label="t('pages.peering.asn')" prefix="AS"
            :placeholder="`${t('pages.signIn.pleaseInput')} ${t('pages.peering.asn')}`"
            class="mb-3" />

        <div class="mb-5">
            <div class="text-subtitle-2 mb-2">{{ t('pages.peering.linkType') }}</div>
            <v-radio-group v-model="props.preferenceForm.linkType" inline>
                <v-radio v-for="linkType in props.router.linkTypes" :key="`linkType_${linkType}`"
                    :value="linkType" :label="t(`pages.peering.${linkType}`)" />
            </v-radio-group>
        </div>

        <div class="mb-5">
            <div class="text-subtitle-2 mb-2">{{ t('pages.peering.bgpExtensions') }}</div>
            <div v-for="extension in props.router.extensions" :key="`extension_${extension}`">
                <v-checkbox v-model="props.preferenceForm.bgpExtensions" :value="extension"
                    :label="t(`pages.peering['${extension}']`)" density="compact" hide-details />
            </div>
        </div>

        <div class="mb-5">
            <div class="text-subtitle-2 mb-2">{{ t('pages.peering.routingPolicy') }}</div>
            <v-radio-group v-model="props.preferenceForm.routingPolicy">
                <div v-for="option in routingPolicyOptions" :key="`policy_${option.value}`">
                    <v-radio :value="option.value" :disabled="option.disabled">
                        <template #label>
                            <div>
                                <div><b>{{ option.label }}</b></div>
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
            <v-btn color="primary" prepend-icon="mdi-send" rounded="xl" @click="props.nextStep()">
                {{ t('pages.signIn.continue') }}
            </v-btn>
        </div>
    </v-form>
</template>

<style scoped>
.preference-form {
    padding: 0;
}
.policy-description {
    font-size: 0.9em;
    margin-top: 2px;
    margin-bottom: 8px;
    max-width: 500px;
    color: rgb(var(--v-theme-on-surface-variant));
}
</style>
