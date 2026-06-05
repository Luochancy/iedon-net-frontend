<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { IPV4_REGEX, IPV6_REGEX, openNotification } from '../../common/helper'
import { RouterInfoResponse, RouterMetadata } from '../../common/packetHandler'
import PeerInfoCard from './peerInfoCard.vue'
import { onUnmounted, ref, watchEffect } from 'vue'

const showErrorDialog = ref(false)
const errorDialogTitle = ref('')
const errorDialogContent = ref('')

const showError = (title: string, content: string) => {
    errorDialogTitle.value = title
    errorDialogContent.value = content
    showErrorDialog.value = true
}

const props = defineProps<{
    router: RouterMetadata,
    nextStep: Function,
    prevStep: Function,
    routerInfo: RouterInfoResponse | null, preferenceForm: {
        linkType: string,
        bgpExtensions: ("mp-bgp" | "extended-nexthop")[],
        routingPolicy: number
    },
    interfaceForm: {
        useIpv4: boolean,
        ipv4: string,
        useIpv6: boolean,
        ipv6: string,
        useIpv6LinkLocal: boolean,
        ipv6LinkLocal: string,
        endpoint: string,
        credential: string,
        mtu: number
    }
}>()

const t = useI18n().t

// Set default MTU based on linkType
const closeWatch = watchEffect(() => {
    if (props.preferenceForm.linkType === 'wireguard') {
        props.interfaceForm.mtu = 1420
    } else if (props.preferenceForm.linkType === 'direct') {
        props.interfaceForm.mtu = 1500
    } else if (props.preferenceForm.linkType === 'gre') {
        props.interfaceForm.mtu = 1476
    } else if (props.preferenceForm.linkType === 'ip6gre') {
        props.interfaceForm.mtu = 1456
    }
})

onUnmounted(() => {
    closeWatch()
})

const checkAndContinue = () => {
    if ((!props.interfaceForm.ipv4 && !props.interfaceForm.ipv6 && !props.interfaceForm.ipv6LinkLocal) ||
        (!props.interfaceForm.useIpv4 && !props.interfaceForm.useIpv6 && !props.interfaceForm.useIpv6LinkLocal)) {
        showError(t('pages.peering.step2'), t('pages.peering.mustEnableAtleastOneProtocol'))
        return
    }

    if (props.preferenceForm.linkType !== 'direct' &&
        props.preferenceForm.linkType !== 'gre' &&
        props.preferenceForm.linkType !== 'ip6gre' &&
        !props.interfaceForm.credential) {
        showError(t('pages.peering.step2'), t('pages.peering.mustEnterTunnelInformation'))
        return
    }

    if (!props.interfaceForm.mtu || props.interfaceForm.mtu < 1280 || props.interfaceForm.mtu > 9999) {
        showError(t('pages.peering.step2'), t('pages.peering.inputValidMTU') || 'Please input a valid MTU (1280-9999)')
        return
    }

    if (!props.routerInfo || !props.routerInfo.passthrough) {
        showError(t('pages.peering.step2'), t('pages.signIn.errorOccurred'))
        return
    }

    if ((props.interfaceForm.useIpv4 && !props.interfaceForm.ipv4) ||
        (props.interfaceForm.useIpv6 && !props.interfaceForm.ipv6) ||
        (props.interfaceForm.ipv6LinkLocal && !props.interfaceForm.ipv6LinkLocal)) {
        showError(t('pages.peering.step2'), t('pages.peering.inputValid'))
        return
    }

    if (!props.interfaceForm.useIpv4) props.interfaceForm.ipv4 = ''
    if (!props.interfaceForm.useIpv6) props.interfaceForm.ipv6 = ''
    if (!props.interfaceForm.useIpv6LinkLocal) props.interfaceForm.ipv6LinkLocal = ''

    try {

        if (props.interfaceForm.ipv4 !== '' && !IPV4_REGEX.test(props.interfaceForm.ipv4) ||
            props.interfaceForm.ipv6 !== '' && !IPV6_REGEX.test(props.interfaceForm.ipv6) ||
            props.interfaceForm.ipv6LinkLocal !== '' && !IPV6_REGEX.test(props.interfaceForm.ipv6LinkLocal)) {
            throw new Error('Invalid IP')
        }

        if (props.interfaceForm.ipv6LinkLocal !== '' &&
            props.interfaceForm.ipv6LinkLocal.toLowerCase().indexOf('fe80::') === -1
            && props.interfaceForm.ipv6LinkLocal.toLowerCase().indexOf('fe80:0000:0000:0000:') === -1
        ) {
            openNotification("topLeft", "error", t('notification.error'), `${props.interfaceForm.ipv6LinkLocal} ❌ \r\nfe80:: ... ✅ \r\nfe80:0000:0000:0000: ... ✅`, 15)
            throw new Error('Invalid IPv6 Link Local')
        }

        if (props.interfaceForm.endpoint.trim() !== '') {
            if (props.interfaceForm.endpoint.indexOf(':') === -1 &&
                props.preferenceForm.linkType !== 'gre' &&
                props.preferenceForm.linkType !== 'ip6gre' &&
                props.preferenceForm.linkType !== 'direct'
            ) throw new Error('Invalid endpoint')

            if (props.preferenceForm.linkType === 'gre' ||
                props.preferenceForm.linkType === 'ip6gre' ||
                props.preferenceForm.linkType === 'direct') {
                if (props.preferenceForm.linkType === 'gre') {
                    if (!IPV4_REGEX.test(props.interfaceForm.endpoint)) throw new Error('Invalid endpoint for GRE')
                } else if (props.preferenceForm.linkType === 'ip6gre') {
                    if (!IPV6_REGEX.test(props.interfaceForm.endpoint)) throw new Error('Invalid endpoint for IP6GRE')
                }
            } else {
                const url = new URL(`https://${props.interfaceForm.endpoint}`)
                props.interfaceForm.endpoint = url.host
            }
        } else {
            if (props.preferenceForm.linkType !== 'wireguard') throw new Error('Invalid endpoint')
            props.interfaceForm.endpoint = ''
        }

    } catch /*(error)*/ {
        showError(t('pages.peering.step2'), t('pages.peering.inputValid'))
        // console.error(error)
        return
    }

    props.nextStep()
    window.scrollTo(0, 0)
}
</script>

<template>
    <peer-info-card :router="props.router" :router-info="props.routerInfo"></peer-info-card>
    <v-form class="interface-form">
        <v-switch v-model="props.interfaceForm.useIpv4" :label="t('pages.peering.useIpv4')" color="primary" hide-details class="mb-3" />

        <v-textarea v-if="props.interfaceForm.useIpv4" v-model="props.interfaceForm.ipv4"
            :label="t('pages.peering.ipv4')" auto-grow rows="1" variant="outlined" rounded="lg" density="comfortable"
            :placeholder="`${t('pages.signIn.pleaseInput')} ${t('pages.peering.ipv4')}`"
            class="mb-3" />

        <v-switch v-model="interfaceForm.useIpv6" :label="t('pages.peering.useIpv6')" color="primary" hide-details class="mb-3" />

        <v-textarea v-if="props.interfaceForm.useIpv6" v-model="props.interfaceForm.ipv6"
            :label="t('pages.peering.ipv6')" auto-grow rows="1" variant="outlined" rounded="lg" density="comfortable"
            :placeholder="`${t('pages.signIn.pleaseInput')} ${t('pages.peering.ipv6')}`"
            class="mb-3" />

        <v-switch v-model="interfaceForm.useIpv6LinkLocal" :label="t('pages.peering.useIpv6LinkLocal')" color="primary" hide-details class="mb-3" />

        <v-textarea v-if="props.interfaceForm.useIpv6LinkLocal" v-model="props.interfaceForm.ipv6LinkLocal"
            :label="t('pages.peering.ipv6LinkLocal')" auto-grow rows="1" variant="outlined" rounded="lg" density="comfortable"
            :placeholder="`${t('pages.signIn.pleaseInput')} ${t('pages.peering.ipv6LinkLocal')}`"
            class="mb-3" />

        <v-textarea v-model="props.interfaceForm.endpoint"
            :label="t('pages.peering.endpoint')" auto-grow rows="1" variant="outlined" rounded="lg" density="comfortable"
            :placeholder="`${t('pages.peering.tunnelEndpointHint')}`"
            class="mb-3" />

        <v-textarea
            v-if="props.preferenceForm.linkType !== 'direct' && props.preferenceForm.linkType !== 'gre' && props.preferenceForm.linkType !== 'ip6gre'"
            v-model="props.interfaceForm.credential"
            :label="t('pages.peering.credential')" auto-grow rows="1" variant="outlined" rounded="lg" density="comfortable"
            :placeholder="`${t('pages.peering.tunnelCredentialHint')}`"
            class="mb-3" />

        <v-text-field v-model.number="props.interfaceForm.mtu" variant="outlined" rounded="lg" density="comfortable"
            :label="t('pages.peering.mtu')" type="number" :min="1280" :max="9999"
            :placeholder="`${t('pages.signIn.pleaseInput')} MTU`"
            class="mb-3" />

        <div class="d-flex justify-center mt-6 ga-3">
            <v-btn variant="outlined" rounded="xl" @click="props.prevStep()">{{ t('pages.peering.back') }}</v-btn>
            <v-btn color="primary" prepend-icon="mdi-send" rounded="pill" @click="checkAndContinue">
                {{ t('pages.signIn.continue') }}
            </v-btn>
        </div>
    </v-form>

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
</template>

<style scoped>
.interface-form {
    padding: 0;
}
</style>