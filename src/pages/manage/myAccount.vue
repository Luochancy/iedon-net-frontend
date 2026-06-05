<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { loggedIn, showSnackbar } from '../../common/helper'
import config from "../../config"

//@ts-ignore
import md5 from 'md5'

const t = useI18n().t
const router = useRouter()

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

</script>

<template>
    <div class="my-account-page">
        <v-card rounded="xl" elevation="0" border class="account-card mb-6">
            <v-card-text>
                <h2 class="text-h6 mb-4 font-weight-medium">{{ t('pages.manage.myAccount') }}</h2>
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
                            <div class="text-caption text-medium-emphasis">AS{{ asn }}</div>
                        </div>
                    </div>
                </div>
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
