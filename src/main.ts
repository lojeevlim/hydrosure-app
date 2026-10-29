import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'lojee-ui/elements'
import './style.css'
import App from './App.vue'
import { router } from './router'

const app = createApp(App).use(createPinia()).use(router)
app.mount('#app')
