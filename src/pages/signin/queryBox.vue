<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { splitMessageToVNodes } from '../../common/helper'
import config from '../../config'
import { themeName } from '../../common/helper'
import kioubitAuthIcon from '../../assets/openAuth/kioubit/auth.svg'
import kioubitAuthIconDark from '../../assets/openAuth/kioubit/auth-dark.svg'

const kioubitIcon = computed(() => themeName.value === 'dark' ? kioubitAuthIcon : kioubitAuthIconDark)

const props = defineProps<{
    queryAsn: Function,
    loading: boolean
}>()

const t = useI18n().t
const asnForm = ref({ asn: Number(localStorage.getItem('lastAsn') || '424242') })
const isLoading = computed(() => props.loading)
</script>

<template>
    <div class="position-relative">
        <v-alert type="info" variant="tonal" rounded="xl" class="mb-6"
            :text="splitMessageToVNodes(t('pages.signIn.step1Introduction'))" />

        <v-form>
            <div class="d-flex flex-column align-center ga-4">
                <v-text-field
                    v-model="asnForm.asn"
                    type="number"
                    prefix="AS"
                    placeholder="424242"
                    :disabled="loading"
                    variant="solo-filled"
                    rounded="pill"
                    density="comfortable"
                    bg-color="surface-container-high"
                    flat
                    style="max-width: 320px;"
                    :rules="[v => !!v || `${t('pages.signIn.pleaseInput')} ${t('pages.signIn.asn')}`]"
                    @keydown.enter="queryAsn(asnForm.asn)"
                />
                <v-btn
                    color="primary"
                    :disabled="loading"
                    :loading="loading"
                    @click="queryAsn(asnForm.asn)"
                    rounded="xl"
                    size="large"
                    min-width="200"
                >
                    <v-icon start>mdi-send</v-icon>
                    {{ t('pages.signIn.signIn') }}
                </v-btn>
            </div>
        </v-form>

        <v-divider v-if="config.openAuthOptions.enableKioubit" class="my-6">
            <span class="px-3 text-caption text-medium-emphasis">{{ t('pages.signIn.youCanAlso') }}</span>
        </v-divider>

        <form v-if="config.openAuthOptions.enableKioubit" class="d-flex justify-center" action="https://dn42.g-load.eu/auth/">
            <input type="hidden" name="return" :value="`${config.openAuthCallback.kioubit}`">
            <v-btn type="submit" color="secondary" variant="tonal" rounded="xl" size="large" class="text-none">
                <v-avatar size="20" class="mr-2">
                    <v-img :src="kioubitIcon" width="20" height="20" />
                </v-avatar>
                {{ t('pages.signIn.authWithKioubit') }}
            </v-btn>
        </form>

        <div class="text-center mt-6">
            <v-btn variant="text" color="primary" href="https://dn42.dev" target="_blank" size="small">
                {{ t('pages.signIn.signUp') }}
            </v-btn>
        </div>
    </div>
</template>

<style scoped>
</style>
