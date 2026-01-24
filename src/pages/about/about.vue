<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { registerPageTitle } from '../../common/helper'
import { LoadingOutlined } from '@ant-design/icons-vue'

const { t } = useI18n()

onMounted(() => {
  registerPageTitle(t('pages.about.title'))
  window.scrollTo(0, 0)
})
</script>

<template>
  <div id="about" class="about-page">
    <loading-outlined class="loading" />
    <h1 class="title">Coming soon</h1>
  </div>
</template>

<style scoped>
.about-page {
  min-height: 70vh;
  max-width: 640px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px 16px;
  text-align: center;
}

.title {
  margin: 0;
  font-size: 30px;
  font-weight: 600;
}

.loading {
  font-size: 36px;
  color: #1890ff;
}
</style>
