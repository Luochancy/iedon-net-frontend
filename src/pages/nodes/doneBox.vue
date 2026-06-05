<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { RouterMetadata } from '../../common/packetHandler'

const t = useI18n().t
const router = useRouter()

const props = defineProps<{
    router: RouterMetadata
}>()

const manageSessions = () => { router.replace({ path: '/manage' }) }
const topPage = () => { router.replace({ path: '/' }) }
</script>

<template>
    <v-empty-state
        icon="mdi-emoticon-happy-outline"
        :title="t('pages.peering.thankYou')"
        :text="props.router.autoPeering ? t('pages.peering.step4Introduction') : t('pages.peering.step4IntroductionReview')"
    >
        <template #actions>
            <v-btn color="primary" rounded="pill" @click="manageSessions">{{ t('pages.signIn.manageSessions') }}</v-btn>
            <v-btn variant="outlined" color="primary" rounded="xl" @click="topPage">{{ t('pages.signIn.topPage') }}</v-btn>
        </template>
    </v-empty-state>
</template>

<style scoped>
</style>