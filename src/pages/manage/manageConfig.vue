<!--
*******************************************************************
pages/manage/manageConfig.vue

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
import { ASN_MAX, ASN_MIN, loggedIn, nullOrEmpty, refreshSiteConfig, siteConfig, showSnackbar } from '../../common/helper'
import { makeRequest } from '../../common/packetHandler'

const t = useI18n().t
const router = useRouter()

const loading = ref(false)
const configForm = ref({ ...siteConfig.value })

onMounted(async () => {
    if (!loggedIn.value) {
        showSnackbar(t('pages.nodes.pleaseSignIn'), 'info')
        router.replace({ path: '/signin' })
        return
    }
})

const saveConfig = async () => {
    if (nullOrEmpty(configForm.value.netAsn) || nullOrEmpty(configForm.value.netName) ||
        isNaN(Number(configForm.value.netAsn)) || Number(configForm.value.netAsn) < ASN_MIN || Number(configForm.value.netAsn) > ASN_MAX) {
        showSnackbar(t('pages.peering.inputValid'), 'error')
        return
    }
    try {
        loading.value = true
        await makeRequest(t, '/admin', {
            action: 'config',
            netAsn: configForm.value.netAsn,
            netName: configForm.value.netName,
            netDesc: configForm.value.netDesc || null,
            footerText: configForm.value.footerText || null,
            maintenanceText: configForm.value.maintenanceText || null
        })
    } catch (error) {
        console.error(error)
    } finally {
        await refreshSiteConfig(t)
        loading.value = false
    }
}

</script>

<template>
    <div class="manage-config-wrapper">
        <v-progress-linear v-if="loading" indeterminate color="primary" />
                <v-card rounded="xl" elevation="0" border class="config-card">
        <v-card-text>
        <h2 class="text-h6 mb-4 font-weight-medium">{{ t('pages.manage.config.changeConfig') }}</h2>
        <v-form class="configForm">
            <v-text-field
                v-model="configForm.netAsn"
                type="number"
                prefix="AS"
                :label="t('pages.manage.config.netAsn')"
                :placeholder="t('pages.signIn.asnPlaceholder')"
                variant="outlined"
                rounded="lg"
                density="comfortable"
                class="mb-2"
            />
            <v-text-field
                v-model="configForm.netName"
                :label="t('pages.manage.config.netName')"
                :placeholder="t('pages.manage.config.netName')"
                variant="outlined"
                rounded="lg"
                density="comfortable"
                class="mb-2"
            />
            <v-textarea
                auto-grow
                v-model="configForm.netDesc"
                :label="t('pages.manage.config.netDesc')"
                :placeholder="t('pages.manage.config.netDesc')"
                variant="outlined"
                rounded="lg"
                density="comfortable"
                class="mb-2"
            />
            <v-textarea
                auto-grow
                v-model="configForm.footerText"
                :label="t('pages.manage.config.footerText')"
                :placeholder="t('pages.manage.config.footerText')"
                variant="outlined"
                rounded="lg"
                density="comfortable"
                class="mb-2"
            />
            <v-textarea
                auto-grow
                v-model="configForm.maintenanceText"
                :label="t('pages.manage.config.maintenanceText')"
                :placeholder="t('pages.manage.config.maintenanceText')"
                variant="outlined"
                rounded="lg"
                density="comfortable"
                class="mb-2"
            />
            <br />
            <div class="text-center">
                <v-btn color="primary" @click="saveConfig" :loading="loading" rounded="pill" size="large">
                    <v-icon start>mdi-send</v-icon>
                    {{ t('pages.manage.config.save') }}
                </v-btn>
            </div>
        </v-form>
        </v-card-text>
        </v-card>
    </div>
</template>

<style scoped>
.manage-config-wrapper {
    max-width: 600px;
    margin: 0 auto;
}
.config-card {
    padding: 8px 0;
}
.configForm {
    max-width: 100%;
}
</style>
