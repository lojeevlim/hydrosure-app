<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { loginSchema } from '@hydrosure/shared'
import LInput from '../components/ui/LInput.vue'
import LCard from '../components/ui/LCard.vue'
import LAlert from '../components/ui/LAlert.vue'
import LButton from '../components/ui/LButton.vue'
import { useAuthStore } from '../stores/auth'
import { useToast } from '../composables/useToast'
import { errorMessage } from '../lib/api'
import { renderGoogleButton } from '../lib/google'
import { isAxiosError } from 'axios'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const toast = useToast()

const form = reactive({ email: '', password: '' })
const errors = reactive<{ email?: string; password?: string }>({})
const loading = ref(false)
const formError = ref('')
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
const googleBtn = ref<HTMLElement | null>(null)

function redirectTarget() {
  const r = route.query.redirect
  return typeof r === 'string' && r.startsWith('/') && !r.startsWith('//') && !r.startsWith('/\\') ? r : '/'
}

async function onGoogleCredential(idToken: string) {
  if (loading.value) return
  formError.value = ''
  loading.value = true
  try {
    await auth.loginWithGoogle(idToken)
    toast.success(`Welcome back, ${auth.user?.name ?? ''}`)
    await router.replace(redirectTarget())
  } catch (e) {
    formError.value = isAxiosError(e) && e.response?.status === 403
      ? errorMessage(e, "Google sign-in is only for admin accounts.")
      : errorMessage(e, 'Google sign in failed')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (!googleClientId || !googleBtn.value) return
  try {
    await renderGoogleButton(googleBtn.value, googleClientId, onGoogleCredential)
  } catch {
    formError.value = 'Google sign in is unavailable right now. Use email and password instead.'
  }
})

async function submit() {
  if (loading.value) return
  errors.email = errors.password = undefined
  formError.value = ''
  const parsed = loginSchema.safeParse(form)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const k = issue.path[0] as 'email' | 'password'
      errors[k] ??= k === 'email' ? 'Enter a valid email address' : 'Password is required'
    }
    return
  }
  loading.value = true
  try {
    await auth.login(parsed.data.email, parsed.data.password)
    toast.success(`Welcome back, ${auth.user?.name ?? ''}`)
    await router.replace(redirectTarget())
  } catch (e) {
    formError.value = errorMessage(e, 'Sign in failed')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-surface p-4 text-fg">
    <LCard title="Sign in" class="w-full max-w-sm">
      <form class="space-y-4" novalidate @submit.prevent="submit" @keydown.enter="submit">
        <h1 class="text-xl font-semibold">Hydrosure POS</h1>
        <div v-if="formError"><LAlert variant="error" heading="Sign in failed">{{ formError }}</LAlert></div>
        <LInput v-model="form.email" label="Email" type="email" placeholder="you@store.com" :error="errors.email" />
        <LInput v-model="form.password" label="Password" type="password" placeholder="Password" :error="errors.password" />
        <LButton class="w-full" label="Sign in" type="button" :loading="loading" @click="submit" />
      </form>
      <div v-if="googleClientId" class="mt-4 space-y-4">
        <div class="flex items-center gap-3 text-sm text-fg-muted">
          <div class="h-px flex-1 bg-current opacity-20" />
          <span>or</span>
          <div class="h-px flex-1 bg-current opacity-20" />
        </div>
        <div ref="googleBtn" class="flex justify-center" />
      </div>
    </LCard>
  </div>
</template>
