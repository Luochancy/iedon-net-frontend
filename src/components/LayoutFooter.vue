<script setup lang="ts">
import { computed } from 'vue'
import { siteConfig, themeName } from '../common/helper'

const footerText = computed(() => (siteConfig.value.footerText || '').trim())
</script>

<template>
    <v-footer color="surface-variant" class="pa-4">
        <v-container fluid class="pa-0" style="max-width: 1200px">
            <div class="d-flex flex-column align-center ga-1">
                <template v-if="footerText">
                    <p class="text-body-small text-medium-emphasis text-center mb-0" style="font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace" v-html="footerText"></p>
                </template>
                <template v-else>
                    <p class="text-body-small text-medium-emphasis text-center mb-0" style="font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace">
                        &copy; 2026 Luochancy. All rights reserved.
                    </p>
                    <p class="text-body-small text-medium-emphasis text-center mb-0" style="font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace">
                        Based on iedon-net-frontend by iEdon.
                    </p>
                </template>
            </div>
        </v-container>
    </v-footer>
</template>
