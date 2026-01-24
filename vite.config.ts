import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

import Components from 'unplugin-vue-components/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import { siteInfo } from './src/branding-info'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    Components({
      resolvers: [
        AntDesignVueResolver({
          importStyle: false, // css in js
        }),
      ],
    }),
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
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      'vue-i18n',
      'ant-design-vue',
      '@ant-design/icons-vue',
      'resolve-accept-language'
    ],
    exclude: ['echarts', 'vue-echarts'] // Load these on-demand
  },
  css:{
    preprocessorOptions:{
      less:{
        javascriptEnabled: true,
        modifyVars: {},
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        // Manual chunking for better caching
        manualChunks: {
          // Core Vue ecosystem
          'vue-vendor': ['vue', 'vue-router', 'vue-i18n'],
          
          // Ant Design Vue - separate chunk for better caching
          'antd-vendor': ['ant-design-vue'],
          
          // Large libraries in separate chunks
          'echarts-vendor': ['echarts', 'vue-echarts'],
          
          // Utilities
          'utils-vendor': ['md5', 'markdown-it', 'resolve-accept-language']
        },
        // Better chunk naming for caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()?.replace(/\.\w+$/, '') ?? 'chunk'
            : 'chunk'
          return `js/${facadeModuleId}-[hash].js`
        },
        assetFileNames: (assetInfo) => {
          // Use the first name from the 'names' array, fallback to empty string if not available
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
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Minify using terser for better compression
    minify: 'terser'
  }
})
