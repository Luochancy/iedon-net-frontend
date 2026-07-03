<!--
*******************************************************************
pages/manage/myAccount.vue

Copyright (C) 2024 iEdon
Copyright (C) 2026 Luochancy

This file is part of a project derived from iedon-net-frontend.
Modified by Luochancy on 2026-06.

Licensed under the GNU General Public License v3.0.
See the LICENSE file in the project root for details.
*******************************************************************
-->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { loggedIn, showSnackbar } from '../../common/helper'
import { makeRequest, WhoisResponse } from '../../common/packetHandler'
import config from "../../config"

//@ts-ignore
import md5 from 'md5'

const t = useI18n().t
const router = useRouter()

const asn = ref('')
const person = ref('')
const gravatarUrl = ref('')
const whoisData = ref<WhoisResponse | null>(null)
const whoisLoading = ref(false)

const getGravatar = (_email: string) => `${config.gravatarUrlPrefix}${md5(_email.trim().toLocaleLowerCase())}`

const fetchWhois = async () => {
    try {
        whoisLoading.value = true
        const resp = await makeRequest(t, '/whois')
        if (resp.success && resp.response) {
            whoisData.value = resp.response as WhoisResponse
        }
    } catch (error) {
        console.error(error)
    } finally {
        whoisLoading.value = false
    }
}

const toList = (val: string | string[] | undefined): string[] => {
    if (!val) return []
    return Array.isArray(val) ? val : [val]
}

onMounted(async () => {
    if (!loggedIn.value) {
        showSnackbar(t('pages.nodes.pleaseSignIn'), 'info')
        router.replace({ path: '/signin' })
        return
    }
    asn.value = localStorage.getItem('asn') || ''
    person.value = localStorage.getItem('person') || ''
    const rawEmail = localStorage.getItem('email') || ''
    if (rawEmail.length !== 0) gravatarUrl.value = getGravatar(rawEmail)
    await fetchWhois()
})

</script>

<template>
    <div class="my-account-page">
        <!-- User Info -->
        <v-card rounded="xl" elevation="0" border class="mb-6">
            <v-card-text>
                <div class="user-info-card">
                    <v-avatar size="48" rounded="lg" class="mr-4" v-if="gravatarUrl.length !== 0">
                        <v-img :src="gravatarUrl" />
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
            </v-card-text>
        </v-card>

        <!-- WHOIS Info -->
        <v-card rounded="xl" elevation="0" border>
            <v-card-text>
                <h2 class="text-h6 mb-4 font-weight-medium d-flex align-center ga-2">
                    <v-icon size="20">mdi-database-search</v-icon>
                    DN42 WHOIS
                </h2>

                <v-progress-linear v-if="whoisLoading" indeterminate color="primary" class="mb-4" />

                <template v-else-if="whoisData">
                    <div class="whois-grid">
                        <div class="whois-item" v-if="whoisData.asn">
                            <span class="whois-label">{{ t('pages.manage.account.asn') }}</span>
                            <span class="whois-value font-weight-medium">{{ whoisData.asn }}</span>
                        </div>
                        <div class="whois-item" v-if="whoisData.asName">
                            <span class="whois-label">{{ t('pages.manage.account.asName') }}</span>
                            <span class="whois-value">{{ whoisData.asName }}</span>
                        </div>
                        <div class="whois-item" v-if="whoisData.descr">
                            <span class="whois-label">{{ t('pages.manage.account.descr') }}</span>
                            <span class="whois-value">{{ whoisData.descr }}</span>
                        </div>
                        <div class="whois-item" v-if="whoisData.country">
                            <span class="whois-label">{{ t('pages.manage.account.country') }}</span>
                            <span class="whois-value">{{ whoisData.country.toUpperCase() }}</span>
                        </div>
                        <div class="whois-item" v-if="whoisData.org">
                            <span class="whois-label">{{ t('pages.manage.account.org') }}</span>
                            <span class="whois-value">{{ whoisData.org }}</span>
                        </div>
                        <div class="whois-item" v-if="whoisData.status">
                            <span class="whois-label">{{ t('pages.manage.account.status') }}</span>
                            <v-chip size="x-small" color="success" variant="flat">{{ whoisData.status }}</v-chip>
                        </div>
                    </div>

                    <v-divider class="my-4" />

                    <div class="whois-grid">
                        <div class="whois-item" v-if="whoisData.adminC">
                            <span class="whois-label">{{ t('pages.manage.account.adminC') }}</span>
                            <span class="whois-value">{{ whoisData.adminC }}</span>
                        </div>
                        <div class="whois-item" v-if="whoisData.techC">
                            <span class="whois-label">{{ t('pages.manage.account.techC') }}</span>
                            <span class="whois-value">{{ whoisData.techC }}</span>
                        </div>
                        <div class="whois-item" v-for="mnt in toList(whoisData.mntBy)" :key="'mnt-' + mnt">
                            <span class="whois-label">{{ t('pages.manage.account.mntBy') }}</span>
                            <span class="whois-value">{{ mnt }}</span>
                        </div>
                        <div class="whois-item" v-for="mnt in toList(whoisData.mntLower)" :key="'mntl-' + mnt">
                            <span class="whois-label">{{ t('pages.manage.account.mntLower') }}</span>
                            <span class="whois-value">{{ mnt }}</span>
                        </div>
                        <div class="whois-item" v-for="mnt in toList(whoisData.mntRoutes)" :key="'mntr-' + mnt">
                            <span class="whois-label">{{ t('pages.manage.account.mntRoutes') }}</span>
                            <span class="whois-value">{{ mnt }}</span>
                        </div>
                        <div class="whois-item" v-if="whoisData.notify">
                            <span class="whois-label">{{ t('pages.manage.account.notify') }}</span>
                            <span class="whois-value">{{ whoisData.notify }}</span>
                        </div>
                        <div class="whois-item" v-if="whoisData.source">
                            <span class="whois-label">{{ t('pages.manage.account.source') }}</span>
                            <span class="whois-value">{{ whoisData.source }}</span>
                        </div>
                    </div>

                    <div v-if="whoisData.remarks" class="mt-4">
                        <span class="whois-label d-block mb-1">{{ t('pages.manage.account.remarks') }}</span>
                        <div class="whois-remarks">
                            <span v-for="line in toList(whoisData.remarks)" :key="line">{{ line }}</span>
                        </div>
                    </div>
                </template>

                <v-alert v-else type="info" variant="tonal" rounded="lg">
                    {{ t('pages.manage.account.whoisUnavailable') }}
                </v-alert>
            </v-card-text>
        </v-card>
    </div>
</template>

<style scoped>
.my-account-page {
    max-width: 600px;
    margin: 0 auto;
}
.user-info-card {
    display: flex;
    align-items: center;
    padding: 16px;
    border-radius: 12px;
    background: rgb(var(--v-theme-surface-variant));
}
.whois-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px 24px;
}
.whois-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
}
.whois-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    color: rgb(var(--v-theme-on-surface-variant));
    letter-spacing: 0.5px;
}
.whois-value {
    font-size: 13px;
    color: rgb(var(--v-theme-on-surface));
    word-break: break-all;
}
.whois-remarks {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 13px;
    color: rgb(var(--v-theme-on-surface-variant));
    padding: 8px 12px;
    border-radius: 8px;
    background: rgb(var(--v-theme-surface-variant));
}
@media (max-width: 480px) {
    .whois-grid {
        grid-template-columns: 1fr;
    }
}
</style>
