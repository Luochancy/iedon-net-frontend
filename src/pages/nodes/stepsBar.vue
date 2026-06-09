<!--
*******************************************************************
pages/nodes/stepsBar.vue

Copyright (C) 2024 iEdon
Copyright (C) 2026 Luochancy

This file is part of a project derived from iedon-net-frontend.
Modified by Luochancy on 2026-06.

Licensed under the GNU General Public License v3.0.
See the LICENSE file in the project root for details.
*******************************************************************
-->
<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
    step: 'preference' | 'interface' | 'setup' | 'done',
    loading: boolean
}>()

const t = useI18n().t

const statusPreference = ref('finish')
const statusInterface = ref('wait')
const statusSetup = ref('wait')
const statusDone = ref('wait')

const currentStep = computed(() => props.step)
const isLoading = computed(() => props.loading)

const currentStepNumber = computed(() => {
    switch (currentStep.value) {
        case 'preference': return 1
        case 'interface': return 2
        case 'setup': return 3
        case 'done': return 4
        default: return 1
    }
})

const watchStop = watch(() => currentStep.value, (newValue: string) => {
    switch (newValue) {
        case 'interface': {
            statusPreference.value = 'finish'
            statusInterface.value = 'process'
            statusSetup.value = 'wait'
            statusDone.value = 'wait'
        }
        break;
        case 'setup': {
            statusPreference.value = 'finish'
            statusInterface.value = 'finish'
            statusSetup.value = 'process'
            statusDone.value = 'wait'
        }
        break;
        case 'done': {
            statusPreference.value = 'finish'
            statusInterface.value = 'finish'
            statusSetup.value = 'finish'
            statusDone.value = 'finish'
        }
        break;
        default: case 'preference': {
            statusPreference.value = 'finish'
            statusInterface.value = 'wait'
            statusSetup.value = 'wait'
            statusDone.value = 'wait'
        }
        break;
    }
})

onUnmounted(() => {
    watchStop()
})

</script>

<template>
    <v-stepper :model-value="currentStepNumber" alt-labels>
        <v-stepper-header>
            <v-stepper-item
                :complete="statusPreference === 'finish'"
                :value="1"
                :title="t('pages.peering.step1')"
            >
                <template #icon>
                    <v-icon>mdi-heart</v-icon>
                </template>
            </v-stepper-item>

            <v-divider />

            <v-stepper-item
                :complete="statusInterface === 'finish'"
                :value="2"
                :title="t('pages.peering.step2')"
            >
                <template #icon>
                    <v-icon>mdi-graph-outline</v-icon>
                </template>
            </v-stepper-item>

            <v-divider />

            <v-stepper-item
                :complete="statusSetup === 'finish'"
                :value="3"
                :title="t('pages.peering.step3')"
            >
                <template #icon>
                    <v-icon>mdi-clock-outline</v-icon>
                </template>
            </v-stepper-item>

            <v-divider />

            <v-stepper-item
                :complete="statusDone === 'finish'"
                :value="4"
                :title="t('pages.peering.step4')"
            >
                <template #icon>
                    <v-icon>mdi-emoticon-happy-outline</v-icon>
                </template>
            </v-stepper-item>
        </v-stepper-header>
    </v-stepper>
</template>

<style scoped>
</style>
