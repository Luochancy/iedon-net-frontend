<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const t = useI18n().t
const router = useRouter()

const asn = ref('')
const person = ref('')

onMounted(() => {
    asn.value = localStorage.getItem('asn') || ''
    person.value = localStorage.getItem('person') || ''
})

const manageSessions = () => { router.replace({ path: '/manage' }) }
const topPage = () => { router.replace({ path: '/' }) }
</script>

<template>
    <div class="text-center">
        <v-icon size="80" color="success" class="mb-4">mdi-emoticon-happy-outline</v-icon>
        <h2 class="text-h5 font-weight-bold mb-2">{{ `${t('pages.signIn.welcomeBack')} ${person || asn || ''}` }}</h2>
        <p class="text-body-1 text-medium-emphasis mb-6">{{ t('pages.signIn.step4Introduction') }}</p>
        <v-divider class="mb-4" />
        <div class="d-flex justify-center ga-3">
            <v-btn color="primary" rounded="pill" size="large" @click="manageSessions">
                {{ t('pages.signIn.manageSessions') }}
            </v-btn>
            <v-btn variant="text" color="primary" @click="topPage">
                {{ t('pages.signIn.topPage') }}
            </v-btn>
        </div>
    </div>
</template>

<style scoped>
</style>