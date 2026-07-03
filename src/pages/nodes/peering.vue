<!--
*******************************************************************
pages/nodes/peering.vue

Copyright (C) 2024 iEdon
Copyright (C) 2026 Luochancy

This file is part of a project derived from iedon-net-frontend.
Modified by Luochancy on 2026-06.

Licensed under the GNU General Public License v3.0.
See the LICENSE file in the project root for details.
*******************************************************************
-->
<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, Ref, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { showSnackbar, ASN_MAX, ASN_MIN, isAdmin, loggedIn, registerPageTitle } from '../../common/helper'
import { CurrentSessionMetadata, GetCurrentSessionResponse, makeRequest, RouterInfoResponse, RouterMetadata, RoutingPolicy, SessionMetadata } from '../../common/packetHandler'
import RouterLocationAvatar from '../../components/RouterLocationAvatar.vue'
import stepsBar from './stepsBar.vue'
import preferenceBox from './preferenceBox.vue'
import interfaceBox from './interfaceBox.vue'
import setupBox from './setupBox.vue'
import doneBox from './doneBox.vue'

const showErrorDialog = ref(false)
const errorDialogTitle = ref('')
const errorDialogContent = ref('')

const showError = (title: string, content: string) => {
    errorDialogTitle.value = title
    errorDialogContent.value = content
    showErrorDialog.value = true
}

const t = useI18n().t
const router = useRouter()
const loading = ref(false)

const nodeUuid = router.currentRoute.value.params.uuid as string || null
const sessionId = router.currentRoute.value.params.sessionId as string || null
const isEditMode = !!sessionId
const node: Ref<RouterMetadata | null> = ref(null)
const existingSession: Ref<CurrentSessionMetadata | null> = ref(null)
try {
    const nodes = localStorage.getItem('routers')
    if (nodes) node.value = (JSON.parse(nodes) as RouterMetadata[]).find(r => r.uuid === nodeUuid) || null
} catch (error) {
    console.error(error)
}

const currentStep: Ref<'preference' | 'interface' | 'setup' | 'done'> = ref('preference')

const stepTitle = computed(() => {
    const titles: Record<string, string> = {
        preference: t('pages.peering.step1'),
        interface: t('pages.peering.step2'),
        setup: t('pages.peering.step3'),
        done: t('pages.peering.step4')
    }
    return titles[currentStep.value] || ''
})

const currentStepNumber = computed(() => {
    const map: Record<string, number> = { preference: 1, interface: 2, setup: 3, done: 4 }
    return map[currentStep.value] || 1
})

watch(currentStep, () => nextTick(() => window.scrollTo({ top: 0, behavior: 'smooth' })))

onMounted(async () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    if (!loggedIn.value) {
        showSnackbar(t('pages.nodes.pleaseSignIn'), 'info')
        router.replace({ path: '/signin' })
        return
    }
    if (!node.value) {
        showSnackbar(t('pages.peering.couldNotGetData'), 'error')
        router.back()
        return
    }

    registerPageTitle(`${node.value?.name} ${t('header.nodes')}`)

    // Load existing session data if in edit mode
    if (isEditMode) {
        await loadExistingSession()
    }
})

onUnmounted(() => {
    closeWatchLinkTypeChange()
})

const preferenceForm = ref({
    asn: '424242',
    linkType: node.value?.linkTypes[0] || '',
    bgpExtensions: node.value?.extensions || [],
    routingPolicy: RoutingPolicy.FULL, // Default to FULL
})

const routerInfo: Ref<RouterInfoResponse | null> = ref(null)
const reuseExistingConfig = ref(false)
const oldRouterInfo: Ref<RouterInfoResponse | null> = ref(null)

// Watch for link type changes to reset reuse config
const closeWatchLinkTypeChange = watch(() => preferenceForm.value.linkType, (newLinkType) => {
    if (isEditMode && existingSession.value) {
        if (existingSession.value.type === newLinkType && oldRouterInfo.value) {
            // Same link type and we have old router info, default to reuse
            reuseExistingConfig.value = true
        } else {
            // Different link type or no old router info, don't reuse
            reuseExistingConfig.value = false
        }
    }
})

const getRouterInfo = async () => {
    if (isAdmin.value) {
        if (preferenceForm.value.asn === '' || isNaN(Number(preferenceForm.value.asn)) || Number(preferenceForm.value.asn) < ASN_MIN || Number(preferenceForm.value.asn) > ASN_MAX) {
            showError(t('pages.peering.adminPeering'), `${t('pages.signIn.pleaseInput')} ${t('pages.peering.asn')}`)
            return
        }
    }

    try {
        loading.value = true

        // If user chose to reuse existing config and we have old router info, use it
        if (isEditMode && reuseExistingConfig.value && oldRouterInfo.value) {
            routerInfo.value = oldRouterInfo.value
        } else {
            // Get new router info from server
            routerInfo.value = null
            const requestData: any = {
                action: 'info',
                router: node.value?.uuid,
                data: {
                    linkType: preferenceForm.value.linkType,
                    bgpExtensions: preferenceForm.value.bgpExtensions
                }
            }
            // Pass ASN when admin is creating peer for another user
            if (isAdmin.value) {
                requestData.asn = Number(preferenceForm.value.asn)
            }
            const resp = await makeRequest(t, '/session', requestData)
            if (resp.success && resp.response) {
                const data = resp.response as RouterInfoResponse
                if (data) {
                    routerInfo.value = data
                }
            }
        }

        currentStep.value = 'interface'
    } catch (error) {
        console.error(error)
    } finally {
        loading.value = false
    }
}

const interfaceForm = ref({
    useIpv4: true,
    ipv4: '',
    useIpv6: true,
    ipv6: '',
    useIpv6LinkLocal: true,
    ipv6LinkLocal: '',
    endpoint: '',
    credential: '',
    mtu: 1280
})

const startPeering = async () => {
    try {
        loading.value = true
        const options = {
            action: isEditMode ? 'modify' : 'add',
            router: node.value?.uuid,
            ipv4: interfaceForm.value.ipv4,
            ipv6: interfaceForm.value.ipv6,
            ipv6LinkLocal: interfaceForm.value.ipv6LinkLocal,
            type: preferenceForm.value.linkType,
            extensions: preferenceForm.value.bgpExtensions,
            policy: preferenceForm.value.routingPolicy,
            mtu: interfaceForm.value.mtu,
            endpoint: interfaceForm.value.endpoint,
            credential: interfaceForm.value.credential,
            data: routerInfo.value
        }

        // Add session ID for modify action
        if (isEditMode && sessionId) {
            Object.assign(options, { session: sessionId })
        }

        if (isAdmin.value) Object.assign(options, { asn: Number(preferenceForm.value.asn) })

        if ((await makeRequest(t, '/session', options)).success) {
            currentStep.value = 'done'
            return
        }

        showError(t('pages.peering.step3'), t('pages.signIn.errorOccurred'))

    } catch (error) {
        console.error(error)
    } finally {
        loading.value = false
    }
}

const loadExistingSession = async () => {
    if (!isEditMode || !sessionId) return

    try {
        loading.value = true
        const resp = await makeRequest(t, '/session', {
            action: 'get',
            session: sessionId
        })
        if (resp.success && resp.response) {
            const exist = (resp.response as unknown as GetCurrentSessionResponse).session
            existingSession.value = exist
            // Pre-populate the forms with existing session data
            if (existingSession.value) {
                preferenceForm.value.asn = existingSession.value.asn.toString()
                preferenceForm.value.linkType = existingSession.value.type
                preferenceForm.value.bgpExtensions = existingSession.value.extensions
                preferenceForm.value.routingPolicy = existingSession.value.policy

                interfaceForm.value.ipv4 = existingSession.value.ipv4 || ""
                interfaceForm.value.ipv6 = existingSession.value.ipv6 || ""
                interfaceForm.value.ipv6LinkLocal = existingSession.value.ipv6LinkLocal || ""
                interfaceForm.value.endpoint = existingSession.value.endpoint || ""
                interfaceForm.value.credential = existingSession.value.credential || ""
                interfaceForm.value.mtu = parseInt(existingSession.value.interface) || 1280

                // Set IPv4/IPv6 usage flags based on data
                interfaceForm.value.useIpv4 = !!existingSession.value.ipv4
                interfaceForm.value.useIpv6 = !!existingSession.value.ipv6
                interfaceForm.value.useIpv6LinkLocal = !!existingSession.value.ipv6LinkLocal

                // Store old router info if available
                if (existingSession.value.data && typeof existingSession.value.data === 'object' && 'info' in existingSession.value.data && 'passthrough' in existingSession.value.data) {
                    oldRouterInfo.value = {
                        info: existingSession.value.data.info,
                        passthrough: existingSession.value.data.passthrough
                    }
                    // Default to reusing existing config in edit mode
                    reuseExistingConfig.value = true
                }
            }
        }
    } catch (error) {
        console.error('Failed to load existing session:', error)
        showSnackbar(t('pages.peering.couldNotGetData'), 'error')
        router.back()
    } finally {
        loading.value = false
    }
}

</script>

<template>
    <section class="peering-page">
        <div class="page-header" v-if="node">
            <router-location-avatar :router="node" class="mr-3"></router-location-avatar>
            <span class="page-title">{{ node?.name }}</span>
            <span v-if="isEditMode" class="edit-badge">
                {{ t('pages.manage.session.edit') }}
            </span>
        </div>
        <div id="peering" v-if="node" class="peering-container">
            <div class="steps-container">
                <steps-bar class="steps" :step="currentStep" :loading="loading"></steps-bar>
            </div>

            <!-- Step title -->
            <div class="step-title">
                <span class="section-label">
                    STEP {{ currentStepNumber }} &middot; {{ stepTitle }}
                </span>
            </div>

            <!-- Step content card -->
            <div class="step-content-card">
                <Transition name="step-slide" mode="out-in">
                    <section v-if="currentStep === 'preference'" key="preference" class="step-box preference">
                        <preference-box :router="node" :preference-form="preferenceForm" :nextStep="getRouterInfo"
                            :is-edit-mode="isEditMode" :existing-session="existingSession"
                            v-model:reuseExistingConfig="reuseExistingConfig"></preference-box>
                    </section>
                    <section v-else-if="currentStep === 'interface'" key="interface" class="step-box interface">
                        <interface-box :router="node" :router-info="routerInfo" :preference-form="preferenceForm"
                            :interface-form="interfaceForm" :nextStep="() => { currentStep = 'setup' }"
                            :prevStep="() => { currentStep = 'preference' }"></interface-box>
                    </section>
                    <section v-else-if="currentStep === 'setup'" key="setup" class="step-box setup">
                        <setup-box :preference-form="preferenceForm" :loading="loading" :router="node"
                            :router-info="routerInfo" :interface-form="interfaceForm" :nextStep="startPeering"
                            :prevStep="() => { currentStep = 'interface' }"></setup-box>
                    </section>
                    <section v-else-if="currentStep === 'done'" key="done" class="step-box done">
                        <done-box :router="node"></done-box>
                    </section>
                </Transition>
                <v-overlay :model-value="loading" contained class="align-center justify-center" style="border-radius: 16px; z-index: 999;">
                    <v-progress-linear indeterminate color="primary" rounded height="4" style="width: 200px" />
                    <div class="text-body-2 text-medium-emphasis mt-3">{{ t("pages.signIn.pleaseWait") }}</div>
                </v-overlay>
            </div>
        </div>

        <v-dialog v-model="showErrorDialog" max-width="400">
            <v-card rounded="xl" class="pa-2">
                <v-card-title class="text-h6">{{ errorDialogTitle }}</v-card-title>
                <v-card-text>{{ errorDialogContent }}</v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn color="primary" @click="showErrorDialog = false" rounded="xl">{{ t('common.ok') }}</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </section>
</template>

<style scoped>
.peering-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px 16px;
}

/* ============================================================
   Page Header
   ============================================================ */
.page-header {
    text-align: center;
    margin: 16px auto 32px;
    display: flex;
    justify-content: center;
    align-items: center;
}

.page-title {
    font-size: 24px;
    font-weight: 600;
    letter-spacing: 0.25px;
    color: rgb(var(--v-theme-on-surface));
}

.edit-badge {
    font-size: 12px;
    color: rgb(var(--v-theme-on-surface-variant));
    margin-left: 10px;
    font-weight: 400;
}

/* ============================================================
   Page Body
   ============================================================ */
#peering {
    margin-bottom: 60px;
    min-height: 300px;
}

.steps-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 24px 16px 12px;
}

/* ============================================================
   Step Title
   ============================================================ */
.step-title {
    text-align: center;
    margin-bottom: 20px;
}

.step-title .section-label {
    font-size: 11px;
    font-weight: 600;
    color: rgb(var(--v-theme-on-surface-variant));
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

/* ============================================================
   Step Content Card
   ============================================================ */
.step-content-card {
    max-width: 700px;
    margin: 0 auto;
    position: relative;
    isolation: isolate;
    background: rgb(var(--v-theme-surface-container-low));
    border: 1px solid rgba(var(--v-border-color), 0.12);
    border-radius: 16px;
    padding: 32px 24px;
}

.step-content-card .step-box.setup {
    max-width: 100%;
}

.steps {
    max-width: 100%;
}

/* ============================================================
   Step Transition (MD3 standard easing)
   ============================================================ */
.step-slide-enter-active {
    transition: opacity 0.3s cubic-bezier(0.0, 0, 0.2, 1), transform 0.35s cubic-bezier(0.0, 0, 0.2, 1);
}

.step-slide-leave-active {
    transition: opacity 0.2s cubic-bezier(0.4, 0, 1, 1), transform 0.25s cubic-bezier(0.4, 0, 1, 1);
}

.step-slide-enter-from {
    opacity: 0;
    transform: translateY(12px);
}

.step-slide-leave-to {
    opacity: 0;
    transform: translateY(-8px);
}

/* ============================================================
   Responsive
   ============================================================ */
@media (max-width: 768px) {
    .step-content-card {
        padding: 20px 16px;
    }
    .step-title {
        margin-bottom: 14px;
    }
}
</style>
