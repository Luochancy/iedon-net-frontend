<!--
*******************************************************************
pages/openAuth/openAuth.vue

Copyright (C) 2024 iEdon
Copyright (C) 2026 Luochancy

This file is part of a project derived from iedon-net-frontend.
Modified by Luochancy on 2026-06.

Licensed under the GNU General Public License v3.0.
See the LICENSE file in the project root for details.
*******************************************************************
-->
<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { AuthOpenResponse, makeRequest } from '../../common/packetHandler'
import { loggedIn, registerPageTitle, showSnackbar } from '../../common/helper'

const t = useI18n().t
const router = useRouter()
const route = useRoute()

onMounted(async () => {
    window.scrollTo(0, 0)
    await router.isReady()

    let type = route.query.type
    if (!type) {
        // Compatibility mode for kioubit
        const token = route.query.token
        if (token === 'kioubit.dn42') type = 'kioubit';
    }
    if (!type) return signInFailed()

    registerPageTitle('DN42 Open Auth')

    if (type === 'kioubit') kioubit()
    else if (type === 'oidc') oidcLogin()
})

const signInFailed = () => {
    showSnackbar(t('pages.signIn.signInFailed'), 'error')
    router.replace({ path: '/signin' })
}

const oidcLogin = async () => {
    try {
        const code = route.query.code as string
        const state = route.query.state as string
        if (!code || !state) return signInFailed()

        const savedState = sessionStorage.getItem('oidc_state')
        const codeVerifier = sessionStorage.getItem('oidc_code_verifier')
        sessionStorage.removeItem('oidc_state')
        sessionStorage.removeItem('oidc_code_verifier')

        if (!savedState || state !== savedState || !codeVerifier) return signInFailed()

        const resp = await makeRequest(t, '/auth', {
            action: 'open',
            type: 'oidc',
            data: { code, code_verifier: codeVerifier }
        })
        if (resp.success && resp.response) {
            const data = resp.response as AuthOpenResponse
            if (!data || !data.authResult) return signInFailed()

            localStorage.setItem('token', data.token)
            localStorage.setItem('asn', data.asn.toString())
            localStorage.setItem('lastAsn', data.asn.toString())

            if (data.person) localStorage.setItem('person', data.person)
            if (data.email) localStorage.setItem('email', data.email)

            loggedIn.value = true

            showSnackbar(t('pages.signIn.welcomeBack', { name: data.person || data.asn }))
            router.replace({ path: '/' })
            window.scrollTo(0, 0)
            return
        }
        signInFailed()
    } catch (error) {
        console.error(error)
        signInFailed()
    }
}

const kioubit = async () => {
    try {
        const { params, signature } = route.query
        if (!params || !signature) return signInFailed()
        const resp = await makeRequest(t, '/auth', {
            action: 'open',
            type: "kioubit",
            data: {
                params,
                signature
            }
        })
        if (resp.success && resp.response) {
            const data = resp.response as AuthOpenResponse
            if (!data || !data.authResult) return signInFailed()

            localStorage.setItem('token', data.token)
            localStorage.setItem('asn', data.asn.toString())
            localStorage.setItem('lastAsn', data.asn.toString())

            if (data.person) localStorage.setItem('person', data.person)
            if (data.email) localStorage.setItem('email', data.email)

            loggedIn.value = true

            showSnackbar(t('pages.signIn.welcomeBack', { name: data.person || data.asn }))
            router.replace({ path: '/' })
            window.scrollTo(0, 0)
            return
        }
        signInFailed()
    } catch (error) {
        console.error(error)
        signInFailed()
    }
}

</script>

<template>
    <v-container class="pa-6" style="max-width: 800px;">
        <v-row justify="center">
            <v-col cols="12">
                <h1 class="text-h4 font-weight-bold text-center mb-2">{{ t('pages.signIn.signIn') }}</h1>

                <v-card rounded="xl" max-width="480" class="mx-auto pa-8 text-center" min-height="300">
                    <div class="d-flex flex-column align-center justify-center" style="height: 100%;">
                        <v-progress-circular indeterminate color="primary" size="72" width="6" class="mb-4" />
                        <div class="text-body-1 text-medium-emphasis">{{ t('pages.signIn.pleaseWait') }}</div>
                    </div>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<style scoped>
</style>
