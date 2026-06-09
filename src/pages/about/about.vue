<!--
*******************************************************************
pages/about/about.vue

Copyright (C) 2026 Luochancy

Licensed under the GNU General Public License v3.0.
See LICENSE in the project root.
*******************************************************************
-->
<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { registerPageTitle } from '../../common/helper'

const { t } = useI18n()

onMounted(() => {
  registerPageTitle(t('pages.about.title'))
  window.scrollTo(0, 0)
})
</script>

<template>
  <v-container class="about-page d-flex flex-column align-center justify-center" style="min-height: 70vh">
    <v-card rounded="xl" elevation="0" color="surface-container-low" border class="pa-12 text-center" style="max-width: 480px; width: 100%">
      <v-icon size="48" color="primary" class="mb-6 loading-icon">mdi-loading</v-icon>
      <h1 class="text-h5 font-weight-bold" style="color: rgb(var(--v-theme-on-surface))">Coming soon</h1>
      <p class="text-body-1 text-medium-emphasis mt-3 mb-0">This page is under construction.</p>
    </v-card>
  </v-container>
</template>

<style scoped>
.loading-icon {
  animation: spin 2s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
