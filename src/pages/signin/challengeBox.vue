<!--
*******************************************************************
pages/signin/challengeBox.vue

Copyright (C) 2024 iEdon
Copyright (C) 2026 Luochancy

This file is part of a project derived from iedon-net-frontend.
Modified by Luochancy on 2026-06.

Licensed under the GNU General Public License v3.0.
See the LICENSE file in the project root for details.
*******************************************************************
-->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { splitMessageToVNodes, showSnackbar } from '../../common/helper'
import { AuthQueryResponse, AuthRequestResponse, AvailableAuthMethod } from '../../common/packetHandler'

const props = defineProps<{
    authRequestResp: AuthRequestResponse | null,
    authQueryResp: AuthQueryResponse | null,
    selectedIndex: number,
    challenge: Function,
    loading: boolean,
    type: AvailableAuthMethod,
    prevStep: Function
}>()

const t = useI18n().t
const challengeForm = ref({
    publicKey: '',
    challengeText: ''
})

const activePanel = ref('challengeHint')

const copyChallengeText = async (c: string) => {
    try {
        await navigator.clipboard.writeText(c.trim())
        showSnackbar(t('pages.nodes.copied'))
    } catch (error) {
        console.error(error)
    }
}
</script>

<template>
    <div class="position-relative">
        <v-alert type="success" variant="tonal" rounded="xl" class="mb-6"
            :text="splitMessageToVNodes(t('pages.signIn.step3Introduction'))" />

        <v-form>
            <v-expansion-panels v-model="activePanel" variant="accordion" rounded="xl" class="mb-6">
                <v-expansion-panel value="challengeHint" rounded="xl">
                    <v-expansion-panel-title>
                        <template #default="{ expanded }">
                            <v-icon :icon="expanded ? 'mdi-chevron-up' : 'mdi-chevron-right'" class="mr-2" />
                            <span class="font-weight-medium">{{ t('pages.signIn.challengeHint') }}</span>
                        </template>
                    </v-expansion-panel-title>
                    <v-expansion-panel-text>
                        <v-card variant="flat" rounded="xl" class="pa-3" color="surface-container-high">
                            <code
                                @click.stop='copyChallengeText(
                                    `echo "${props.authRequestResp?.authChallenge}" | gpg --clearsign --armor -u ${props.authQueryResp?.availableAuthMethods.find(v => Number(v.id) === selectedIndex)?.data}`
                                )'
                                v-if="props.type === AvailableAuthMethod.PGP_ASCII_ARMORED_CLEAR_SIGN"
                                class="text-caption d-block cursor-pointer" style="word-break: break-all; user-select: text;">
                                {{ `echo "${props.authRequestResp?.authChallenge}" | gpg --clearsign --armor -u ${props.authQueryResp?.availableAuthMethods.find(v => Number(v.id) === selectedIndex)?.data}` }}
                            </code>
                            <code @click.stop='copyChallengeText(props.authRequestResp?.authChallenge || "")' v-else
                                class="text-caption d-block cursor-pointer" style="word-break: break-all; user-select: text;">
                                {{ props.authRequestResp?.authChallenge }}
                            </code>
                        </v-card>
                    </v-expansion-panel-text>
                </v-expansion-panel>
            </v-expansion-panels>

            <v-textarea v-if="props.type === AvailableAuthMethod.PGP_ASCII_ARMORED_CLEAR_SIGN"
                v-model="challengeForm.publicKey"
                :label="`${t('pages.signIn.pgpPublicKey')}`"
                auto-grow
                variant="solo-filled"
                rounded="xl"
                density="comfortable"
                bg-color="surface-container-high"
                flat
                :placeholder="`${t('pages.signIn.pgpPublicKey')}`"
                :rules="[v => !!v || `${t('pages.signIn.pleaseInput')} ${t('pages.signIn.pgpPublicKey')}`]"
                class="mb-4"
            />
            <v-textarea
                v-model="challengeForm.challengeText"
                :label="t('pages.signIn.challengeText')"
                auto-grow
                variant="solo-filled"
                rounded="xl"
                density="comfortable"
                bg-color="surface-container-high"
                flat
                :placeholder="`${t('pages.signIn.challengeTextPlaceholder')}`"
                :rules="[v => !!v || `${t('pages.signIn.pleaseInput')} ${t('pages.signIn.challengeText')}`]"
                class="mb-4"
            />

            <v-divider class="mb-4" />
            <div class="d-flex justify-end ga-2">
                <v-btn variant="text" @click="props.prevStep()" rounded="xl">
                    {{ t('pages.peering.back') }}
                </v-btn>
                <v-btn color="primary" rounded="pill" size="large"
                    @click="props.challenge(challengeForm)" :loading="loading" :disabled="loading">
                    <v-icon start>mdi-send</v-icon>
                    {{ t('pages.signIn.continue') }}
                </v-btn>
            </div>
        </v-form>
    </div>
</template>

<style scoped></style>