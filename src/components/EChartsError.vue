<!--
*******************************************************************
components/EChartsError.vue

Copyright (C) 2024 iEdon
Copyright (C) 2026 Luochancy

This file is part of a project derived from iedon-net-frontend.
Modified by Luochancy on 2026-06.

Licensed under the GNU General Public License v3.0.
See the LICENSE file in the project root for details.
*******************************************************************
-->
<template>
  <div style="height: 300px; display: flex; align-items: center; justify-content: center; color: #ff4d4f;">
    <div style="text-align: center;">
      <div style="font-size: 24px; margin-bottom: 12px;">⚠️</div>
      <div>{{ t('common.chartError.loadFailed') }}</div>
      <div style="font-size: 12px; color: #999; margin-top: 8px;">{{ t('common.chartError.refreshHint') }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
</script>
