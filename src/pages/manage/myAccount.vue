<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { loggedIn, themeName, showSnackbar } from '../../common/helper'
import { makeRequest, SetPasswordResponse } from '../../common/packetHandler'
import config from "../../config"

//@ts-ignore
import md5 from 'md5'

const t = useI18n().t
const router = useRouter()

const loading = ref(false)
const asn = ref('')
const person = ref('')
const email = ref('')

const getGravatar = (_email: string) => `${config.gravatarUrlPrefix}${md5(_email.trim().toLocaleLowerCase())}`

onMounted(async () => {
    if (!loggedIn.value) {
        showSnackbar(t('pages.nodes.pleaseSignIn'), 'info')
        router.replace({ path: '/signin' })
        return
    }
    asn.value = localStorage.getItem('asn') || ''
    person.value = localStorage.getItem('person') || ''
    email.value = localStorage.getItem('email') || ''
    if (email.value.length !== 0) email.value = getGravatar(email.value)
})

const setPasswordForm = ref({
    password: '',
    confirmPassword: '',
})

const setPassword = async () => {
    if (setPasswordForm.value.password !== setPasswordForm.value.confirmPassword) {
        showSnackbar(t('pages.peering.inputValid'), 'error')
        return
    }
    try {
        loading.value = true

        const resp = await makeRequest(t, '/settings', {
            action: 'password',
            password: setPasswordForm.value.password
        })
        if (resp.success && resp.response) {
            const data = resp.response as SetPasswordResponse
            if (data && data.success) {
                showSnackbar(t('pages.manage.account.successSetPassword'), 'success')
                return
            }
        }

        showSnackbar(t('pages.signIn.errorOccurred'), 'error')

    } catch (error) {
        console.error(error)
    } finally {
        loading.value = false
    }
}

</script>

<template>
    <div class="my-account-page">
        <v-overlay :model-value="loading" class="align-center justify-center" persistent>
            <v-progress-circular indeterminate size="64" />
        </v-overlay>
        <v-card rounded="xl" elevation="0" variant="elevated" class="account-card mb-6">
            <v-card-text>
        <h2 class="text-h6 mb-4 font-weight-medium">{{ t('pages.manage.account.setYourPassword') }}</h2>
        <div class="mb-4">
            <v-alert type="info" variant="tonal" rounded="lg">
                <p>{{ t('pages.manage.account.hint1') }}</p>
                <p>{{ t('pages.manage.account.hint2') }}</p>
                <p>{{ t('pages.manage.account.hint3') }}</p>
            </v-alert>
        </div>
        <div class="mb-6">
            <div class="user-info-card">
                <v-avatar size="48" rounded="lg" class="mr-4" v-if="email.length !== 0">
                    <v-img :src="email" />
                </v-avatar>
                <v-avatar size="48" rounded="lg" class="mr-4" color="primary"
                    v-else-if="person.substring(0, 1) || asn.substring(asn.length - 4 - 1)">
                    <span class="text-h6 text-white">{{ person.substring(0, 1) ||
                        asn.substring(asn.length - 4 - 1) }}</span>
                </v-avatar>
                <v-avatar size="48" rounded="lg" class="mr-4" color="surface-variant" v-else>
                    <v-icon>mdi-account</v-icon>
                </v-avatar>
                <div class="user-details">
                    <div class="text-subtitle-1 font-weight-medium">{{ person || asn }}</div>
                    <div class="text-caption text-medium-emphasis">{{ asn }}</div>
                </div>
            </div>
        </div>
        <v-form :model="setPasswordForm" class="setPasswordForm" @submit.prevent="setPassword">
            <input type="text" name="username" :value="asn" autocomplete="username" style="display:none" />
            <v-text-field
                v-model="setPasswordForm.password"
                :label="t('pages.manage.account.password')"
                type="password"
                autocomplete="new-password"
                :placeholder="t('pages.manage.account.password')"
                variant="outlined"
                rounded="lg"
                density="comfortable"
                class="mb-2"
            />
            <v-text-field
                v-model="setPasswordForm.confirmPassword"
                :label="t('pages.manage.account.confirmPassword')"
                type="password"
                autocomplete="new-password"
                :placeholder="t('pages.manage.account.confirmPassword')"
                variant="outlined"
                rounded="lg"
                density="comfortable"
                class="mb-2"
            />
            <br />
            <div class="text-center">
                <v-btn color="primary" @click="setPassword" prepend-icon="mdi-send" rounded="xl" size="large">
                    {{ t('pages.manage.account.setPassword') }}
                </v-btn>
            </div>
        </v-form>
            </v-card-text>
        </v-card>
    </div>
</template>

<style scoped>
.my-account-page {
    max-width: 600px;
    margin: 0 auto;
}
.account-card {
    padding: 8px 0;
}
.user-info-card {
    display: flex;
    align-items: center;
    padding: 16px;
    border-radius: 12px;
    background: rgb(var(--v-theme-surface-variant));
}
</style>
