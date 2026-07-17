<script setup lang="ts">
import type { StockStatus } from '@/types'

defineProps<{
  status: StockStatus
  label?: string
}>()

const classes: Record<StockStatus, string> = {
  ok: 'badge-ok',
  warning: 'badge-warning',
  critical: 'badge-critical',
}

const labels: Record<StockStatus, string> = {
  ok: 'OK',
  warning: 'Bas',
  critical: 'Critique',
}
</script>

<template>
  <span :class="classes[status]">{{ label ?? labels[status] }}</span>
</template>
