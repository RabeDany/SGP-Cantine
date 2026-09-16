<script setup lang="ts">
import Icon from '@/components/Icon.vue'

defineProps<{
  label: string
  value: string | number
  icon?: string
  color?: 'green' | 'amber' | 'red' | 'blue' | 'gray'
}>()

const colors = {
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  blue: 'bg-blue-50 text-blue-600',
  gray: 'bg-slate-100 text-slate-600',
}
</script>

<template>
  <div class="card p-4">
    <div class="flex items-start justify-between">
      <div>
        <p class="text-xs font-medium text-slate-500">{{ label }}</p>
        <p class="mt-2 text-3xl font-bold tracking-tight text-slate-900">{{ value }}</p>
      </div>
      <span v-if="icon" class="flex h-10 w-10 items-center justify-center rounded-xl" :class="colors[color ?? 'gray']">
        <Icon :name="icon" className="h-5 w-5" />
      </span>
    </div>
  </div>
</template>
