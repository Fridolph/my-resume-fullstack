<script setup lang="ts">
import type { CapabilitySection, CapabilityView } from '@rs/common'
import type { ResumeStyleId } from '#layers/public-resume/app/types/resume'
import ResumeSectionCard from '../ResumeSectionCard.vue'
import CapabilityChart from './CapabilityChart.vue'
defineProps<{ section: CapabilitySection; view: CapabilityView; variant: ResumeStyleId }>()
</script>

<template>
  <ResumeSectionCard
    :section="{ key: section.id, label: section.title, icon: section.icon || 'i-lucide-chart-no-axes-combined' }"
    :variant="variant"
  >
    <p v-if="section.description" class="resume-muted">{{ section.description }}</p>
    <CapabilityChart :data="section.data" :view="view" />
    <div class="grid gap-4" :class="variant === 'pro' ? 'sm:grid-cols-2' : ''">
      <article
        v-for="group in section.data.groups"
        :key="group.id"
        class="min-w-0 space-y-2 rounded-xl border p-4"
        style="border-color: var(--resume-border)"
      >
        <h3 class="font-semibold">{{ group.title }}</h3>
        <p v-if="group.summary" class="resume-muted text-xs">{{ group.summary }}</p>
        <div class="flex flex-wrap gap-2">
          <span v-for="item in group.items.slice(0, view.previewItemCount)" :key="item.id" class="resume-chip">{{
            item.name
          }}</span>
        </div>
        <details v-if="group.items.length">
          <summary class="resume-accent cursor-pointer text-xs">展开 {{ group.items.length }} 项能力与实践说明</summary>
          <ul class="mt-3 space-y-3">
            <li v-for="item in group.items" :key="item.id" class="break-words">
              <strong>{{ item.name }}</strong>
              <p v-if="item.description" class="resume-muted">{{ item.description }}</p>
              <a
                v-for="link in item.evidenceLinks"
                :key="link.id"
                :href="link.url"
                target="_blank"
                rel="noopener noreferrer"
                class="resume-accent mr-3 underline"
                >{{ link.label }}</a
              >
            </li>
          </ul>
        </details>
      </article>
    </div>
    <p v-if="!section.data.groups.length" class="resume-muted">尚未添加能力分组。</p>
  </ResumeSectionCard>
</template>
