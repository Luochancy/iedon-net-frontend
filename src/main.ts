import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import vuetify from './plugins/vuetify'

import router from './router'
import App from './App.vue'

import translation from './i18n/export'

const i18n = createI18n({
    legacy: false,
    locale: 'en_US',
    fallbackLocale: 'en_US',
    messages: translation,
})

const app = createApp(App)
app.use(vuetify).use(i18n).use(router).mount('#app')
