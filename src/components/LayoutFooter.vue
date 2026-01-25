<script setup lang="ts">
import { computed } from 'vue'
import { siteConfig, themeName } from '../common/helper'

const footerText = computed(() => (siteConfig.value.footerText || '').trim())
</script>

<template>
    <a-layout-footer id="footer" :class="themeName">
      <template v-if="footerText">
        <p class="mono" v-html="footerText"></p>
      </template>
      <template v-else>
        <p class="mono">&copy; 2026 Luochancy. All rights reserved.</p>
        <p class="mono">Based on iedon-net-frontend by iEdon.</p>
      </template>
    </a-layout-footer>
</template>

<style scoped>
#footer {
  font-size: .875rem;
  text-align: center;
  width: 100%;
  padding: 1.5rem;
}
#footer.light {
  background-color: #f8f8f8;
  color: #6c757d;
}
#footer.dark {
  background-color: #111;
  color: #87929c;
}
#footer .mono {
  font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  font-size: .75rem;
  margin: .25rem 0 0 0;
}
#footer a {
  font-weight: 600;
  color: #495057;
}
#footer a:hover {
  color: #007bff;
  text-decoration: underline;
}
</style>
