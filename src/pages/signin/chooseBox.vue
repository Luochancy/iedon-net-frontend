<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { splitMessageToVNodes } from '../../common/helper'
import { AuthQueryResponse, AvailableAuthMethod } from '../../common/packetHandler'

const props = defineProps<{
    authQueryResp: AuthQueryResponse | null,
    requestChallenge: Function,
    loading: boolean,
    prevStep: Function
}>()

const t = useI18n().t
const requestChallengeForm = ref({ method: 0 })

const isLoading = computed(() => props.loading)
const data = computed(() => props.authQueryResp)

// Filter out PASSWORD auth methods — password login disabled on web
const filteredMethods = computed(() =>
    (props.authQueryResp?.availableAuthMethods || []).filter(
        m => m.type !== AvailableAuthMethod.PASSWORD
    )
)

const hasNoMethods = computed(() => filteredMethods.value.length === 0)

const activePanel = ref(0)

const onRadioChange = (val: number | null) => {
    if (val === null) return
    activePanel.value = val
}

const onPanelChange = (val: number | null) => {
    if (val !== null && val !== undefined) requestChallengeForm.value.method = val
}

// Initialize default selection to first non-PASSWORD method
const initDefaultMethod = () => {
    if (filteredMethods.value.length > 0) {
        const first = filteredMethods.value[0]
        requestChallengeForm.value.method = Number(first.id)
        activePanel.value = Number(first.id)
    }
}

// Watch for data availability to set initial selection
watch(filteredMethods, (methods) => {
    if (methods.length > 0 && requestChallengeForm.value.method === 0) {
        initDefaultMethod()
    }
}, { immediate: true })
</script>

<template>
    <div class="position-relative">
        <v-alert type="success" variant="tonal" rounded="xl" class="mb-6"
            :text="splitMessageToVNodes(t('pages.signIn.step2Introduction'))" />

        <div v-if="hasNoMethods">
            <v-alert type="warning" variant="tonal" rounded="xl" class="mb-6"
                :text="t('pages.signIn.noWebAuthMethods')" />
            <div class="d-flex justify-end ga-2">
                <v-btn variant="text" @click="props.prevStep()" rounded="xl">
                    {{ t('pages.peering.back') }}
                </v-btn>
            </div>
        </div>

        <v-form v-else>
            <v-expansion-panels v-model="activePanel" variant="accordion" rounded="xl" class="mb-6"
                @update:model-value="onPanelChange">
                <v-expansion-panel v-for="method in filteredMethods" :key="`desc_${method.id}`" :value="method.id"
                    rounded="xl">
                    <v-expansion-panel-title>
                        <template #default="{ expanded }">
                            <v-icon :icon="expanded ? 'mdi-chevron-up' : 'mdi-chevron-right'" class="mr-2" />
                            <span class="font-weight-medium">{{ method.id + 1 }}. {{ t(`pages.signIn.authMethods[${method.type}]`) }}</span>
                        </template>
                    </v-expansion-panel-title>
                    <v-expansion-panel-text>
                        <v-card variant="flat" rounded="xl" class="pa-3" color="surface-container-high">
                            <code class="text-caption" style="word-break: break-all; user-select: text;">
                                {{ method.data || '' }}
                            </code>
                        </v-card>
                    </v-expansion-panel-text>
                </v-expansion-panel>
            </v-expansion-panels>

            <div class="mb-6">
                <div class="text-subtitle-1 font-weight-medium mb-3">{{ t('pages.signIn.authenticateWith') }}</div>
                <v-radio-group v-model="requestChallengeForm.method" @update:model-value="onRadioChange">
                    <v-radio v-for="method in filteredMethods" :key="`method_${method.id}`"
                        :label="`${method.id + 1} (${t(`pages.signIn.authMethods[${method.type}]`)})`"
                        :value="method.id" color="primary" />
                </v-radio-group>
            </div>

            <v-divider class="mb-4" />
            <div class="d-flex justify-end ga-2">
                <v-btn variant="text" @click="props.prevStep()" rounded="xl">
                    {{ t('pages.peering.back') }}
                </v-btn>
                <v-btn color="primary" rounded="xl" size="large"
                    @click="props.requestChallenge(requestChallengeForm.method)" :loading="loading" :disabled="loading">
                    <v-icon start>mdi-send</v-icon>
                    {{ t('pages.signIn.continue') }}
                </v-btn>
            </div>
        </v-form>
    </div>
</template>

<style scoped></style>
