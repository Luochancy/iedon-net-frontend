<script setup lang="ts">
import { Ref, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { AuthQueryResponse, AuthRequestResponse, AuthChallengeResponse, makeRequest, AvailableAuthMethod } from '../../common/packetHandler'
import { loggedIn, registerPageTitle, showSnackbar } from '../../common/helper'
import stepsBar from './stepsBar.vue'
import queryBox from './queryBox.vue'
import chooseBox from './chooseBox.vue'
import challengeBox from './challengeBox.vue'
import doneBox from './doneBox.vue'

onMounted(() => {
    window.scrollTo(0, 0)
    registerPageTitle(t('pages.signIn.signIn'))
})

const ASN_MIN = 0
const ASN_MAX = 4294967295

const t = useI18n().t

const _asn = ref('0')
const currentStep: Ref<'query' | 'choose' | 'challenge' | 'done'> = ref('query')
const loading = ref(false)

const customQuery = ref('')
const customChoose = ref(AvailableAuthMethod.PASSWORD)
const customChooseTitle = ref('')
const customChooseIndex = ref(0)

const authQueryResp: Ref<AuthQueryResponse | null> = ref(null)
const authRequestResp: Ref<AuthRequestResponse | null> = ref(null)
const queryAsn = async (asn: number) => {
    _asn.value = '0'

    if (!asn || asn < ASN_MIN || asn > ASN_MAX) {
        showSnackbar(`${t('pages.signIn.pleaseInput')} ${t('pages.signIn.asn')}`, 'error')
        return
    }

    try {
        authQueryResp.value = null
        loading.value = true
        const resp = await makeRequest(t, '/auth', {
            action: 'query',
            asn
        })
        if (resp.success && resp.response) {
            const data = resp.response as AuthQueryResponse
            if (!data || data.availableAuthMethods.length === 0) {
                showSnackbar(t('pages.signIn.couldNotFindAuthMethod'), 'error')
                return
            }
            authQueryResp.value = data
            currentStep.value = 'choose'
            customQuery.value = `${t('pages.signIn.hi')} ${data.person}`
            _asn.value = asn.toString()
            window.scrollTo(0, 0)
        }
    } catch (error) {
        console.error(error)
    } finally {
        loading.value = false
    }
}

const requestChallenge = async (selectedMethod: number) => {
    try {
        authRequestResp.value = null
        loading.value = true
        const resp = await makeRequest(t, '/auth', {
            action: 'request',
            authMethod: selectedMethod,
            authState: authQueryResp.value?.authState
        })

        if (resp.success && resp.response) {
            const data = resp.response as AuthRequestResponse
            if (!data || !data.authState || !data.authChallenge) {
                showSnackbar(t('pages.signIn.errorOccurred'), 'error')
                return
            }

            authRequestResp.value = data
            currentStep.value = 'challenge'
            if (authQueryResp.value) {
                customChooseIndex.value = selectedMethod
                customChoose.value = authQueryResp.value.availableAuthMethods[selectedMethod].type
                customChooseTitle.value = t(`pages.signIn.authMethodsTiny[${authQueryResp.value.availableAuthMethods[selectedMethod].type}]`)
                window.scrollTo(0, 0)
            }
        }
    } catch (error) {
        console.error(error)
    } finally {
        loading.value = false
    }
}

const challenge = async (data: { publicKey: string, challengeText: string }) => {
    if (data.challengeText === '') {
        showSnackbar(`${t('pages.signIn.pleaseInput')} ${t('pages.signIn.challengeText')}`, 'error')
        return
    }
    try {
        loading.value = true

        let challengeData: string | object = ''
        if (!data.publicKey) {
            challengeData = data.challengeText;
        } else {
            challengeData = {
                publicKey: data.publicKey,
                signedMessage: data.challengeText
            }
        }

        const resp = await makeRequest(t, '/auth', {
            action: 'challenge',
            authState: authRequestResp.value?.authState,
            data: challengeData
        })

        if (resp.success && resp.response) {
            const data = resp.response as AuthChallengeResponse
            if (!data || !data.authResult) {
                showSnackbar(t('pages.signIn.signInFailed'), 'error')
                return
            }

            if (data.token) {
                localStorage.setItem('token', data.token)
            }

            localStorage.setItem('person', authQueryResp.value?.person || '')
            authQueryResp.value?.availableAuthMethods.forEach(m => {
                if (m && m.type === AvailableAuthMethod.EMAIL && m.data) {
                    localStorage.setItem('email', m.data)
                }
            })
            localStorage.setItem('asn', _asn.value)
            localStorage.setItem('lastAsn', _asn.value)
            loggedIn.value = true

            currentStep.value = 'done'
            showSnackbar(`${t('pages.signIn.welcomeBack')} ${authQueryResp.value?.person || _asn.value}`)
            window.scrollTo(0, 0)
        }
    } catch (error) {
        console.error(error)
    } finally {
        loading.value = false
    }
}
</script>

<template>
    <!-- Full-page loading overlay (below top bar) -->
    <v-overlay
        :model-value="loading"
        class="align-center justify-center"
        persistent
        contained
        style="top: 64px"
    >
        <v-progress-circular indeterminate color="primary" size="48" width="4" />
    </v-overlay>

    <v-container class="pa-6" style="max-width: 480px;">
        <v-card rounded="xl" class="pa-6 pa-sm-8" color="surface-container-low" elevation="0" border>
            <h1 class="text-h5 font-weight-bold text-center mb-6">{{ t('pages.signIn.signIn') }}</h1>

<!-- Progress stepper - temporarily hidden for redesign
        <steps-bar :step="currentStep" :custom-query-title="customQuery"
        :custom-choose-title="customChooseTitle" :loading="loading" class="mb-6" /> -->

            <template v-if="currentStep === 'query'">
                <query-box :loading="loading" :query-asn="queryAsn" />
            </template>
            <template v-else-if="currentStep === 'choose'">
                <choose-box :prev-step="() => currentStep = 'query'" :loading="loading"
                    :auth-query-resp="authQueryResp" :request-challenge="requestChallenge" />
            </template>
            <template v-else-if="currentStep === 'challenge'">
                <challenge-box :prev-step="() => currentStep = 'choose'" :loading="loading"
                    :auth-request-resp="authRequestResp" :auth-query-resp="authQueryResp"
                    :selectedIndex="customChooseIndex" :challenge="challenge"
                    :type="customChoose" />
            </template>
            <template v-else-if="currentStep === 'done'">
                <done-box />
            </template>
        </v-card>
    </v-container>
</template>

<style scoped>
</style>
