<script setup lang="ts">
import type { ResumeSection } from '@rs/common'
import { firstText, sectionData, texts } from './format'

/** 基本信息（纸面版式）：姓名 + headline + 摘要 + 联系方式，单栏排布，不带主题色 */
const props = defineProps<{ section: ResumeSection }>()

const data = computed(() => sectionData(props.section))
const name = computed(() => firstText(data.value, ['name']))
const headline = computed(() => firstText(data.value, ['headline']))
const summary = computed(() => firstText(data.value, ['summary']))
const contacts = computed(() => texts((data.value.links as unknown) ?? []).slice(0, 4))
</script>

<template>
  <header class="border-b border-neutral-300 pb-2">
    <h1 class="text-xl font-bold leading-tight">{{ name || '未命名' }}</h1>
    <p v-if="headline" class="mt-0.5 text-xs text-neutral-600">{{ headline }}</p>
    <p v-if="summary" class="mt-1 text-[11px] leading-4 text-neutral-700">{{ summary }}</p>
    <p v-if="contacts.length" class="mt-1 text-[10px] text-neutral-500">{{ contacts.join(' · ') }}</p>
  </header>
</template>
