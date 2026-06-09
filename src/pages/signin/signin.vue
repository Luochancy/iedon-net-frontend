<!--
*******************************************************************
pages/signin/signin.vue

Copyright (C) 2024 iEdon
Copyright (C) 2026 Luochancy

This file is part of a project derived from iedon-net-frontend.
Modified by Luochancy on 2026-06.

Licensed under the GNU General Public License v3.0.
See the LICENSE file in the project root for details.
*******************************************************************
-->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { showSnackbar, loggedIn, themeName } from '../../common/helper'
import { makeRequest, AuthQueryResponse, AuthRequestResponse, AuthChallengeResponse, AvailableAuthMethod } from '../../common/packetHandler'
import config from '../../config'
import kioubitAuthIcon from '../../assets/openAuth/kioubit/auth.svg'
import kioubitAuthIconDark from '../../assets/openAuth/kioubit/auth-dark.svg'
import { useRouter } from 'vue-router'

const t = useI18n().t
const router = useRouter()

type Step = 'query' | 'choose' | 'challenge' | 'done'

const currentStep = ref<Step>('query')
const loading = ref(false)
const snackbarError = ref(false)

// Kioubit icon
const kioubitIcon = computed(() => themeName.value === 'dark' ? kioubitAuthIcon : kioubitAuthIconDark)

// ── Step 1: ASN Query ──
const asn = ref(localStorage.getItem('lastAsn') || '424242')

const onAsnInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  target.value = target.value.replace(/\D/g, '')
  asn.value = target.value
}

let authState = ''
let challengeAuthState = ''

const submitAsn = async () => {
  const val = Number(asn.value.trim())
  if (!val) return
  loading.value = true
  try {
    const resp = await makeRequest(t, '/auth', {
      action: 'query',
      asn: val
    })
    if (resp.success && resp.response) {
      const data = resp.response as AuthQueryResponse
      if (!data || !data.availableAuthMethods || data.availableAuthMethods.length === 0) {
        showSnackbar(t('pages.signIn.couldNotFindAuthMethodShort'), 'error', 8000)
        return
      }
      authQueryResp.value = data
      authState = data.authState || ''
      currentStep.value = 'choose'
    }
  } catch {
    snackbarError.value = true
  } finally {
    loading.value = false
  }
}

// ── Step 2: Choose Method ──
const authQueryResp = ref<AuthQueryResponse | null>(null)
const methodsLoading = ref(false)

const filteredMethods = computed(() =>
  (authQueryResp.value?.availableAuthMethods || []).filter(
    m => m.type !== AvailableAuthMethod.PASSWORD
  )
)

const goMethod = async (methodIdx: number) => {
  methodsLoading.value = true
  try {
    const resp = await makeRequest(t, '/auth', {
      action: 'request',
      authMethod: methodIdx,
      authState
    })
    if (resp.success && resp.response) {
      const data = resp.response as AuthRequestResponse
      if (!data || !data.authState || !data.authChallenge) {
        showSnackbar(t('pages.signIn.errorOccurred'), 'error', 8000)
        return
      }
      authRequestResp.value = data
      selectedIndex.value = methodIdx
      challengeAuthState = data.authState || ''
      currentStep.value = 'challenge'
    }
  } catch {
    snackbarError.value = true
  } finally {
    methodsLoading.value = false
  }
}

// ── Step 3: Challenge ──
const authRequestResp = ref<AuthRequestResponse | null>(null)
const selectedIndex = ref(0)
const publicKey = ref('')
const challengeText = ref('')
const verifyLoading = ref(false)

const selectedMethodType = computed(() =>
  authQueryResp.value?.availableAuthMethods.find(m => Number(m.id) === selectedIndex.value)
)

const isPgp = computed(() => selectedMethodType.value?.type === AvailableAuthMethod.PGP_ASCII_ARMORED_CLEAR_SIGN)
const isEmail = computed(() => selectedMethodType.value?.type === AvailableAuthMethod.EMAIL)

const emailSentSnackbar = ref(false)
const copyBtnText = ref(t('pages.signIn.copy'))
const emailAddr = computed(() => filteredMethods.value.find(m => Number(m.id) === selectedIndex.value)?.data || '')

const copyChallengeCommand = async () => {
  const challenge = authRequestResp.value?.authChallenge || ''
  const fp = authQueryResp.value?.availableAuthMethods.find(v => Number(v.id) === selectedIndex.value)?.data
  let cmd = `echo "${challenge}" | gpg --clearsign --armor`
  if (fp) cmd += ` -u ${fp}`
  try {
    await navigator.clipboard.writeText(cmd)
    copyBtnText.value = t('pages.nodes.copied')
    setTimeout(() => { copyBtnText.value = t('pages.signIn.copy') }, 2000)
  } catch {
    // Fallback: try execCommand
    const ta = document.createElement('textarea')
    ta.value = cmd
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    copyBtnText.value = t('pages.nodes.copied')
    setTimeout(() => { copyBtnText.value = t('pages.signIn.copy') }, 2000)
  }
}


const doVerify = async () => {
  if (!challengeText.value.trim()) return
  // For PGP, publicKey is required
  if (isPgp.value && !publicKey.value.trim()) {
    showSnackbar(`${t('pages.signIn.pleaseInput')} ${t('pages.signIn.pgpPublicKey')}`, 'error', 5000)
    return
  }
  verifyLoading.value = true
  try {
    const challengeData = isPgp.value
      ? { publicKey: publicKey.value.trim(), signedMessage: challengeText.value.trim() }
      : challengeText.value.trim()
    const resp = await makeRequest(t, '/auth', {
      action: 'challenge',
      authState: challengeAuthState,
      data: challengeData
    })
    if (resp.success && resp.response) {
      const data = resp.response as AuthChallengeResponse
      if (!data || !data.authResult) {
        showSnackbar(t('pages.signIn.signInFailed'), 'error', 8000)
        return
      }
      if (data.token) localStorage.setItem('token', data.token)
      localStorage.setItem('person', authQueryResp.value?.person || '')
      localStorage.setItem('asn', asn.value)
      localStorage.setItem('lastAsn', asn.value)
      if (emailAddr.value) localStorage.setItem('email', emailAddr.value)
      loggedIn.value = true
      currentStep.value = 'done'
    }
  } catch {
    snackbarError.value = true
  } finally {
    verifyLoading.value = false
  }
}

const doVerifyEmail = async () => {
  if (!challengeText.value.trim()) return
  verifyLoading.value = true
  try {
    const resp = await makeRequest(t, '/auth', {
      action: 'challenge',
      authState: challengeAuthState,
      data: challengeText.value.trim()
    })
    if (resp.success && resp.response) {
      const data = resp.response as AuthChallengeResponse
      if (!data || !data.authResult) {
        showSnackbar(t('pages.signIn.signInFailed'), 'error', 8000)
        return
      }
      if (data.token) localStorage.setItem('token', data.token)
      localStorage.setItem('person', authQueryResp.value?.person || '')
      localStorage.setItem('asn', asn.value)
      localStorage.setItem('lastAsn', asn.value)
      if (emailAddr.value) localStorage.setItem('email', emailAddr.value)
      loggedIn.value = true
      currentStep.value = 'done'
    }
  } catch {
    snackbarError.value = true
  } finally {
    verifyLoading.value = false
  }
}

// ── Step 4: Done ──
const signInAgain = () => {
  currentStep.value = 'query'
  asn.value = localStorage.getItem('lastAsn') || '424242'
  publicKey.value = ''
  challengeText.value = ''
  authQueryResp.value = null
  authRequestResp.value = null
  authState = ''
}

onMounted(() => {
  const hasToken = !!localStorage.getItem('token')
  if (hasToken) {
    router.replace('/manage')
    return
  }
  window.scrollTo(0, 0)
})
</script>

<template>
  <section>
    <v-container class="pa-6 d-flex justify-center">
      <div style="max-width: 420px; width: 100%;" class="d-flex flex-column">

        <div class="step-wrapper">
          <transition name="step" mode="out-in">
            <div :key="currentStep">

              <!-- ═══════ Step 1: ASN Query ═══════ -->
              <template v-if="currentStep === 'query'">
                <div class="text-center mb-6">
                  <v-icon size="36" color="primary" class="mb-2">mdi-shield-lock-outline</v-icon>
                  <h1 class="text-h5 font-weight-bold">{{ t('pages.signIn.signInToPeerHub') }}</h1>
                  <p class="text-body-3 text-medium-emphasis mt-1">{{ t('pages.signIn.authenticateWithDn42') }}</p>
                </div>

                <v-alert type="info" variant="tonal" rounded="xl" class="mb-6"
                  :text="t('pages.signIn.step1Introduction')" />

                <v-card color="surface-container-low" border class="pa-5 mb-5">
                  <div class="d-flex align-center mb-3">
                    <v-icon size="18" color="primary" class="mr-2">mdi-account-circle</v-icon>
                    <span class="text-subtitle-2 font-weight-medium">{{ t('pages.signIn.asnLogin') }}</span>
                  </div>

                  <v-text-field
                    v-model="asn"
                    type="number"
                    prefix="AS"
                    placeholder="424242"
                    variant="solo-filled"
                    rounded="pill"
                    density="default"
                    flat
                    bg-color="surface-container-high"
                    hide-details
                    class="mb-3"
                    @input="onAsnInput"
                    @keydown.enter="submitAsn"
                  />

                  <v-btn
                    color="primary"
                    rounded="pill"
                    size="large"
                    block
                    :disabled="!asn.trim() || loading"
                    :loading="loading"
                    @click="submitAsn"
                  >
                    {{ t('pages.signIn.continue') }}
                    <v-icon end size="18">mdi-arrow-right</v-icon>
                  </v-btn>
                </v-card>

                <!-- Divider -->
                <v-divider v-if="config.openAuthOptions.enableKioubit" class="my-6">
                  <span class="px-3 text-caption text-medium-emphasis">{{ t('pages.signIn.youCanAlso') }}</span>
                </v-divider>

                <!-- External auth -->
                <div class="d-flex flex-column align-center ga-2" style="max-width: 95%; margin: 0 auto;">
                  <form v-if="config.openAuthOptions.enableKioubit" class="d-flex justify-center"
                    action="https://dn42.g-load.eu/auth/" style="width: 100%;">
                    <input type="hidden" name="return" :value="`${config.openAuthCallback.kioubit}`">
                    <button type="submit" class="v-btn v-theme--luocynetDark text-secondary v-btn--density-default rounded-xl v-btn--size-large v-btn--variant-tonal text-none" style="width: 100%;">
                      <span class="v-btn__overlay"></span>
                      <span class="v-btn__underlay"></span>
                      <span class="v-btn__content" data-no-activater="">
                        <div class="v-avatar v-theme--luocynetDark v-avatar--density-default v-avatar--variant-flat mr-2" style="width: 20px; height: 20px;">
                          <div class="v-responsive v-img" style="height: 20px; width: 20px;">
                            <div class="v-responsive__sizer" style="padding-bottom: 100%;"></div>
                            <img class="v-img__img v-img__img--cover" :src="kioubitIcon" style="">
                            <!---->
                          </div>
                        </div>
                        {{ t('pages.signIn.authWithKioubit') }}
                      </span>
                    </button>
                  </form>
                </div>
              </template>

              <!-- ═══════ Step 2: Choose Method ═══════ -->
              <template v-if="currentStep === 'choose'">
                <div class="text-center mb-6">
                  <v-icon size="36" color="primary" class="mb-2">mdi-account-lock-open</v-icon>
                  <h2 class="text-h5 font-weight-bold">{{ t('pages.signIn.step2') }}</h2>
                  <p class="text-body-3 text-medium-emphasis mt-2">{{ t('pages.signIn.weFoundMethods') }}</p>
                  <v-chip size="small" color="primary" variant="tonal" class="mt-1">
                    AS {{ asn }}
                  </v-chip>
                </div>

                <div class="position-relative" style="border-radius: 12px;">
                  <v-card color="surface-container-low" border class="pa-4">
                    <v-list variant="text" rounded="xl" density="compact" class="bg-transparent pa-0">
                      <v-list-item
                        v-for="(method, i) in filteredMethods"
                        :key="i"
                        rounded="xl"
                        class="mb-1"
                        color="surface-container-high"
                        @click="goMethod(Number(method.id))"
                      >
                        <template #prepend>
                          <v-icon size="18" color="primary">
                            {{ method.type === AvailableAuthMethod.PGP_ASCII_ARMORED_CLEAR_SIGN ? 'mdi-lock-outline' : 'mdi-email-outline' }}
                          </v-icon>
                        </template>
                        <v-list-item-title class="text-body-1 font-weight-medium">
                          {{ method.type === AvailableAuthMethod.PGP_ASCII_ARMORED_CLEAR_SIGN
                            ? 'PGP' : 'Email' }}
                        </v-list-item-title>
                        <v-list-item-subtitle class="text-caption text-medium-emphasis">
                          {{ method.data }}
                        </v-list-item-subtitle>
                        <template #append>
                          <v-icon size="16" color="on-surface-variant">mdi-chevron-right</v-icon>
                        </template>
                      </v-list-item>
                    </v-list>
                  </v-card>

                  <!-- Loading overlay -->
                  <div v-if="methodsLoading" class="position-absolute d-flex justify-center align-center"
                    style="inset: 0; background: rgba(var(--v-theme-surface-container-low), 0.7); border-radius: inherit;">
                    <v-progress-circular indeterminate size="32" color="primary" />
                  </div>
                </div>

                <!-- Back -->
                <div class="text-center mt-4">
                  <v-btn variant="text" color="medium-emphasis" size="small" rounded="lg"
                    @click="currentStep = 'query'" class="text-none">
                    <v-icon start size="14">mdi-arrow-left</v-icon>
                    换个 ASN
                  </v-btn>
                </div>
              </template>

              <!-- ═══════ Step 3: Challenge ═══════ -->
              <template v-if="currentStep === 'challenge'">
                <div class="text-center mb-6">
                  <v-icon size="36" color="primary" class="mb-2">
                    {{ isPgp ? 'mdi-lock-outline' : 'mdi-email-outline' }}
                  </v-icon>
                  <h2 class="text-h5 font-weight-bold">
                    {{ isPgp ? 'PGP' : 'Email' }}
                  </h2>
                  <v-chip size="small" color="primary" variant="tonal" class="mt-1">
                    AS {{ asn }}
                  </v-chip>
                </div>

                <!-- PGP -->
                <template v-if="isPgp">
                  <v-card color="surface-container-low" border class="pa-3 mb-3">
                    <div class="text-caption text-medium-emphasis mb-2">{{ t('pages.signIn.challengeHint') }}</div>
                    <v-card color="surface-container-high" variant="flat" rounded="lg" class="pa-2">
                      <code class="text-caption cursor-pointer" style="word-break: break-all; user-select: text;"
                        @click="copyChallengeCommand">echo "{{ authRequestResp?.authChallenge }}" | gpg --clearsign --armor{{ authQueryResp?.availableAuthMethods.find(v => Number(v.id) === selectedIndex)?.data ? ` -u ${authQueryResp?.availableAuthMethods.find(v => Number(v.id) === selectedIndex)?.data}` : '' }}</code>
                    </v-card>
                    <div class="d-flex mt-2">
                      <v-btn variant="text" size="x-small" color="primary" rounded="lg" class="text-none"
                        @click="copyChallengeCommand">
                        <v-icon start size="12">mdi-content-copy</v-icon>
                        {{ copyBtnText }}
                      </v-btn>
                    </div>
                  </v-card>

                  <v-card color="surface-container-low" border rounded="xl" class="pa-4 mb-3">
                    <v-textarea
                      v-model="publicKey"
                      :label="t('pages.signIn.pgpPublicKey')"
                      placeholder="-----BEGIN PGP PUBLIC KEY BLOCK-----"
                      auto-grow
                      variant="solo-filled"
                      rounded="xl"
                      flat
                      bg-color="surface-container-high"
                      hide-details
                      rows="3"
                      class="mb-3"
                    />
                    <v-divider class="mb-3" />
                    <v-textarea
                      v-model="challengeText"
                      :label="t('pages.signIn.challengeText')"
                      :placeholder="t('pages.signIn.pgpPlaceholder')"
                      auto-grow
                      variant="solo-filled"
                      rounded="xl"
                      flat
                      bg-color="surface-container-high"
                      hide-details
                      rows="3"
                    />
                  </v-card>

                  <v-btn
                    color="primary"
                    rounded="pill"
                    block
                    size="large"
                    :disabled="!challengeText.trim()"
                    :loading="verifyLoading"
                    @click="doVerify"
                  >
                    <v-icon start>mdi-send</v-icon>
                    {{ t('pages.signIn.continue') }}
                  </v-btn>
                </template>

                <!-- Email -->
                <template v-else>
                  <v-alert type="info" variant="tonal" rounded="xl" class="mb-4">
                    {{ t('pages.signIn.emailSentInfo', { email: emailAddr }) }}
                  </v-alert>
                  <div class="d-flex ga-2 mb-3 justify-center">
                    <v-text-field
                      v-model="challengeText"
                      :placeholder="t('pages.signIn.emailPlaceholder')"
                      variant="solo-filled"
                      rounded="pill"
                      density="compact"
                      flat
                      hide-details
                      bg-color="surface-container-high"
                      single-line
                      style="width: 160px;"
                      @keydown.enter="doVerifyEmail"
                    >
                      <template #prepend-inner>
                        <v-icon size="14" color="on-surface-variant">mdi-form-textbox-password</v-icon>
                      </template>
                    </v-text-field>
                    <v-btn
                      color="primary"
                      rounded="pill"
                      :disabled="!challengeText.trim()"
                      :loading="verifyLoading"
                      @click="doVerifyEmail"
                    >
                      {{ t('pages.signIn.continue') }}
                      <v-icon end size="16">mdi-send</v-icon>
                    </v-btn>
                  </div>
                </template>

                <div class="d-flex justify-center mt-4 ga-2">
                  <v-btn variant="text" color="medium-emphasis" size="small" rounded="lg"
                    @click="currentStep = 'choose'" class="text-none">
                    <v-icon start size="14">mdi-arrow-left</v-icon>
                    {{ t('pages.peering.back') }}
                  </v-btn>
                </div>

                <!-- Email sent snackbar -->
                <v-snackbar v-model="emailSentSnackbar" :timeout="5000" color="success" location="bottom right" rounded="lg" variant="elevated">
                  <div class="d-flex align-center">
                    <v-icon start size="20" class="mr-2">mdi-check-circle-outline</v-icon>
                    {{ t('pages.signIn.emailSentSnackbar', { email: emailAddr }) }}
                  </div>
                  <template #actions>
                    <v-btn icon size="small" rounded="lg" variant="text" @click="emailSentSnackbar = false">
                      <v-icon>mdi-close</v-icon>
                    </v-btn>
                  </template>
                </v-snackbar>
              </template>

              <!-- ═══════ Step 4: Done ═══════ -->
              <template v-if="currentStep === 'done'">
                <div class="d-flex flex-column align-center text-center">
                  <v-icon size="56" color="primary" class="mb-4">mdi-check-circle</v-icon>
                  <h1 class="text-h4 font-weight-bold mb-2">{{ t('pages.signIn.welcome') }}</h1>
                  <p class="text-body-2 text-medium-emphasis mb-6">{{ t('pages.signIn.welcomeDesc') }}</p>
                  <v-btn color="primary" rounded="pill" @click="router.replace('/manage')">
                    <v-icon start size="16">mdi-view-dashboard</v-icon>
                    {{ t('pages.signIn.goToDashboard') }}
                  </v-btn>
                </div>
              </template>

            </div>
          </transition>
        </div>

        <!-- Error snackbar -->
        <v-snackbar v-model="snackbarError" :timeout="5000" color="error" location="bottom right" rounded="lg" variant="elevated">
          <div class="d-flex align-center">
            <v-icon start size="20" class="mr-2">mdi-alert-circle-outline</v-icon>
            {{ t('pages.signIn.errorOccurred') }}
          </div>
          <template #actions>
            <v-btn icon size="small" rounded="lg" variant="text" @click="snackbarError = false">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </template>
        </v-snackbar>

      </div>
    </v-container>
  </section>
</template>

<style>
.step-enter-active,
.step-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.step-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.step-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}
</style>
