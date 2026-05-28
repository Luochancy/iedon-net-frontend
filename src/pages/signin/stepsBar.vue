<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
    step: 'query' | 'choose' | 'challenge' | 'done',
    customQueryTitle: string,
    customChooseTitle: string,
    loading: boolean
}>()

const t = useI18n().t

const statusQuery = ref('finish')
const statusChoose = ref('wait')
const statusChallenge = ref('wait')
const statusDone = ref('wait')

const currentStep = computed(() => props.step)
const isLoading = computed(() => props.loading)
const customQuery = computed(() => props.customQueryTitle)
const customChoose = computed(() => props.customChooseTitle)

const currentStepNumber = computed(() => {
    switch (currentStep.value) {
        case 'query': return 1
        case 'choose': return 2
        case 'challenge': return 3
        case 'done': return 4
        default: return 1
    }
})

const watchStop = watch(() => currentStep.value, (newValue: string) => {
    switch (newValue) {
        case 'choose': {
            statusQuery.value = 'finish'
            statusChoose.value = 'process'
            statusChallenge.value = 'wait'
            statusDone.value = 'wait'
        }
        break;
        case 'challenge': {
            statusQuery.value = 'finish'
            statusChoose.value = 'finish'
            statusChallenge.value = 'process'
            statusDone.value = 'wait'
        }
        break;
        case 'done': {
            statusQuery.value = 'finish'
            statusChoose.value = 'finish'
            statusChallenge.value = 'finish'
            statusDone.value = 'finish'
        }
        break;
        default: case 'query': {
            statusQuery.value = 'finish'
            statusChoose.value = 'wait'
            statusChallenge.value = 'wait'
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
    <v-stepper :model-value="currentStepNumber" alt-labels flat class="bg-transparent">
        <v-stepper-header style="background: transparent; box-shadow: none;">
            <v-stepper-item
                :complete="statusQuery === 'finish'"
                :value="1"
                :title="`${customQuery || t('pages.signIn.step1')}`"
                color="primary"
            >
                <template #icon>
                    <v-progress-circular v-if="currentStep === 'query' && isLoading" indeterminate size="20" width="2" />
                    <v-icon v-else>mdi-magnify</v-icon>
                </template>
            </v-stepper-item>

            <v-divider />

            <v-stepper-item
                :complete="statusChoose === 'finish'"
                :value="2"
                :title="`${customChoose || t('pages.signIn.step2')}`"
                color="primary"
            >
                <template #icon>
                    <v-progress-circular v-if="currentStep === 'choose' && isLoading" indeterminate size="20" width="2" />
                    <v-icon v-else>mdi-heart</v-icon>
                </template>
            </v-stepper-item>

            <v-divider />

            <v-stepper-item
                :complete="statusChallenge === 'finish'"
                :value="3"
                :title="t('pages.signIn.step3')"
                color="primary"
            >
                <template #icon>
                    <v-progress-circular v-if="currentStep === 'challenge' && isLoading" indeterminate size="20" width="2" />
                    <v-icon v-else>mdi-account</v-icon>
                </template>
            </v-stepper-item>

            <v-divider />

            <v-stepper-item
                :complete="statusDone === 'finish'"
                :value="4"
                :title="`${t('pages.signIn.step4')}`"
                color="primary"
            >
                <template #icon>
                    <v-progress-circular v-if="currentStep === 'done' && isLoading" indeterminate size="20" width="2" />
                    <v-icon v-else>mdi-emoticon-happy-outline</v-icon>
                </template>
            </v-stepper-item>
        </v-stepper-header>
    </v-stepper>
</template>

<style scoped>
</style>
