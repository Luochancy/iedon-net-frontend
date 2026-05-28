import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

import { siteInfo } from './src/branding-info'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'html-transform',
      transformIndexHtml(html) {
        return html.replace(
          /%SITE_TITLE%/g,
          siteInfo.title
        ).replace(
          /%SITE_NAME%/g,
          siteInfo.name
        ).replace(
          /%SITE_DESCRIPTION%/g,
          siteInfo.description
        ).replace(
          /%SITE_KEYWORDS%/g,
          siteInfo.keywords
        ).replace(
          /%OG_TITLE%/g,
          siteInfo.title
        ).replace(
          /%OG_SITE_NAME%/g,
          siteInfo.shortName
        ).replace(
          /%OG_DESCRIPTION%/g,
          siteInfo.description
        ).replace(
          /%OG_URL%/g,
          siteInfo.url
        )
      }
    }
  ],
  server: {
    port: 3001
  },
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      'vue-i18n',
      'vuetify',
      'resolve-accept-language'
    ],
    exclude: ['echarts', 'vue-echarts']
  },
  css: {
    preprocessorOptions: {
      sass: {
        api: 'modern-compiler',
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'vue-i18n'],
          'vuetify-vendor': ['vuetify'],
          'echarts-vendor': ['echarts', 'vue-echarts'],
          'utils-vendor': ['md5', 'markdown-it', 'resolve-accept-language']
        },
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()?.replace(/\.\w+$/, '') ?? 'chunk'
            : 'chunk'
          return `js/${facadeModuleId}-[hash].js`
        },
        assetFileNames: (assetInfo) => {
          const assetBaseName = Array.isArray(assetInfo.names) && assetInfo.names.length > 0 ? assetInfo.names[0] : ''
          const info = assetBaseName.split('.')
          const extType = info[info.length - 1]
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            return `images/[name]-[hash][extname]`
          }
          if (/css/i.test(extType)) {
            return `css/[name]-[hash][extname]`
          }
          return `assets/[name]-[hash][extname]`
        }
      }
    },
    cssCodeSplit: true,
    minify: 'terser'
  }
})
