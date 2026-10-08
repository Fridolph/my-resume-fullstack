<script setup lang="ts">
const options = [
  { label: "View", value: "view" },
  { label: "Code", value: "code" },
];
const modelValue = defineModel<string>({ default: "view" });
</script>

<template>
  <div class="sticky right-2 flex flex-1 justify-end">
    <USelect v-model="modelValue" :items="options" size="sm" variant="ghost" class="w-28" />
  </div>
</template>
