<script setup lang="ts">
import Icon from '@/components/Icon.vue'

defineProps<{
  label: string
  value: string | number
  icon?: string
  color?: 'green' | 'amber' | 'red' | 'blue' | 'gray'
}>()

const colors = {
  green: 'border-green-200 bg-green-50 text-green-800',
  amber: 'border-amber-200 bg-amber-50 text-amber-800',
  red: 'border-red-200 bg-red-50 text-red-800',
  blue: 'border-blue-200 bg-blue-50 text-blue-800',
  gray: 'border-gray-200 bg-gray-50 text-gray-800',
}
</script>

<template>
  <div class="card border-l-4" :class="colors[color ?? 'gray']">
    <div class="flex items-start justify-between">
      <div>
        <p class="text-xs font-medium uppercase tracking-wide opacity-70">{{ label }}</p>
        <p class="mt-1 text-2xl font-bold">{{ value }}</p>
      </div>
      <Icon v-if="icon" :name="icon" className="h-10 w-10 text-current" />
    </div>
  </div>
</template>
