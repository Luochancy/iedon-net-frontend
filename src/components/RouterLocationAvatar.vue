<!--
*******************************************************************
components/RouterLocationAvatar.vue

Copyright (C) 2024 iEdon
Copyright (C) 2026 Luochancy

This file is part of a project derived from iedon-net-frontend.
Modified by Luochancy on 2026-06.

Licensed under the GNU General Public License v3.0.
See the LICENSE file in the project root for details.
*******************************************************************
-->
<script setup lang="ts">
import { iso31661Alpha2ToNumeric } from 'iso-3166'
import { RouterMetadata } from '../common/packetHandler'
import config from "../config"

const props = defineProps<{
    router?: RouterMetadata,
    hidePeeringDot?: boolean,
    color?: string
}>()
</script>

<template>
    <div class="router-avatar-wrapper md3-avatar">
        <template v-if="!hidePeeringDot">
            <v-badge v-if="router" :model-value="props.color !== undefined && props.color !== null && props.color !== ''" :color="props.color" dot floating offset-x="-2" offset-y="-2">
                <v-avatar size="40" rounded="lg" class="flag-avatar">
                <img v-if="iso31661Alpha2ToNumeric[router.location] !== undefined" :src="`${config.root}flags/${router.location.toLowerCase()}.svg`" width="40" class="country-flag" />
                <div class="text-box" v-else-if="router.location">
                    <div class="text-wrapper">
                        <span class="text-avatar">{{ router.location.length > 3 ? router.location.substring(0, 3) : router.location }}</span>
                    </div>
                </div>
                </v-avatar>
            </v-badge>
        </template>
        <template v-else-if="router">
            <v-avatar size="40" rounded="lg" class="flag-avatar">
            <img v-if="iso31661Alpha2ToNumeric[router.location] !== undefined" :src="`${config.root}flags/${router.location.toLowerCase()}.svg`" width="40" class="country-flag" />
                <div class="text-box" v-else-if="router.location">
                    <div class="text-wrapper">
                        <span class="text-avatar">{{ router.location.length > 3 ? router.location.substring(0, 3) : router.location }}</span>
                    </div>
                </div>
            </v-avatar>
        </template>
    </div>
</template>

<style scoped>
.router-avatar-wrapper {
    display: inline-block;
    vertical-align: middle;
}
.flag-avatar {
    overflow: hidden;
    border: 1px solid rgba(var(--v-border-color), 0.12);
}
.country-flag {
    width: 100%;
    height: 100%;
    object-fit: cover;
    vertical-align: middle;
}
.text-box {
    height: 40px;
    width: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: normal;
}
.text-wrapper {
    border-radius: 8px;
    background-color: rgb(var(--v-theme-primary));
    padding: 4px 6px;
    vertical-align: middle;
}
.text-avatar {
    font-weight: 500;
    font-size: 13px;
    color: rgb(var(--v-theme-on-primary));
}
</style>
