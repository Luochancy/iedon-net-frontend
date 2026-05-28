<template>
    <div class="landing-page">
        <!-- Hero Section -->
        <section class="hero-section">
            <v-container style="max-width: 1200px">
                <div class="d-flex flex-column align-center text-center py-8 py-md-16 ga-4 ga-md-6">
                    <!-- ASN Badge -->
                    <v-chip
                        v-if="siteConfig?.netAsn"
                        color="primary"
                        variant="tonal"
                        size="large"
                        rounded="xl"
                        prepend-icon="mdi-lan-connect"
                        class="text-overline font-weight-bold"
                    >
                        AS{{ siteConfig.netAsn }}
                    </v-chip>

                    <!-- Title -->
                    <h1 class="text-h4 text-sm-h3 text-md-h1 font-weight-bold" style="line-height: 1.15; max-width: 800px; word-break: break-word; color: rgb(var(--v-theme-on-surface))">
                        {{ siteConfig?.netName }}
                    </h1>

                    <!-- Subtitle -->
                    <p class="text-h6 text-md-h5 font-weight-regular text-medium-emphasis" style="max-width: 640px; line-height: 1.6">
                        {{ siteInfo.landingSubtitle }}
                    </p>

                    <!-- CTA -->
                    <div class="d-flex ga-4 mt-4 flex-wrap justify-center">
                        <v-btn
                            color="primary"
                            size="x-large"
                            rounded="xl"
                            elevation="2"
                            @click="startPeering"
                        >
                            <v-icon start>mdi-lightning-bolt</v-icon>
                            {{ t('pages.landing.startPeering') }}
                        </v-btn>
                    </div>
                </div>
            </v-container>
        </section>

        <!-- Statistics Section -->
        <section>
            <v-container style="max-width: 1200px" class="py-16">
                <v-row dense>
                    <v-col cols="12" md="4">
                        <v-card rounded="xl" elevation="0" class="pa-6 text-center" color="surface-container-low" border>
                            <div class="text-h3 font-weight-bold text-primary mb-2">{{ totalRouters }}</div>
                            <div class="text-body-1 text-medium-emphasis">{{ t('pages.nodes.totalRouters') }}</div>
                        </v-card>
                    </v-col>
                    <v-col cols="12" md="4">
                        <v-card rounded="xl" elevation="0" class="pa-6 text-center" color="surface-container-low" border>
                            <div class="text-h3 font-weight-bold text-primary mb-2">{{ availableForAuto }}</div>
                            <div class="text-body-1 text-medium-emphasis">{{ t('pages.nodes.availableForAuto') }}</div>
                        </v-card>
                    </v-col>
                    <v-col cols="12" md="4">
                        <v-card rounded="xl" elevation="0" class="pa-6 text-center" color="surface-container-low" border>
                            <div class="text-h3 font-weight-bold text-primary mb-2">{{ totalSessions }}</div>
                            <div class="text-body-1 text-medium-emphasis">{{ t('pages.nodes.totalSessions') }}</div>
                        </v-card>
                    </v-col>
                </v-row>
            </v-container>
        </section>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { makeRequest, RouterMetadata, RoutersResponse } from '../../common/packetHandler'
import { registerPageTitle, siteConfig } from '../../common/helper'
import { siteInfo } from '../../branding'

const { t } = useI18n()
const router = useRouter()

const nodes = ref<RouterMetadata[]>([])

const totalRouters = computed(() => nodes.value.length)
const totalSessions = computed(() => nodes.value.reduce((sum, r) => sum + r.sessionCount, 0))
const availableForAuto = computed(() => nodes.value.filter(r => r.openPeering && r.autoPeering && r.sessionCount < r.sessionCapacity).length)

const fetchNodes = async () => {
    try {
        const resp = await makeRequest(t, '/list/routers')
        if (resp.success && resp.response) {
            const data = resp.response as RoutersResponse
            if (data && Array.isArray(data.routers)) {
                nodes.value = data.routers.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
            }
        }
    } catch (error) {
        console.error('Failed to fetch nodes:', error)
    }
}

const startPeering = () => {
    router.push('/nodes')
}

onMounted(() => {
    registerPageTitle('')
    fetchNodes()
})
</script>

<style scoped>
.hero-section {
    background: linear-gradient(180deg, rgba(var(--v-theme-primary), 0.04) 0%, transparent 100%);
}
</style>
