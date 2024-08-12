<template>
  <main>
    <MdEditor v-model="state.text" :theme="state.theme" style="width: 100%; height: 100vh;"/>
    <!-- :pageFullscreen="true" -->
  </main>
</template>

<script setup>
import { reactive  } from 'vue';
import { MdEditor, config  } from 'md-editor-v3';
import 'md-editor-v3/lib/style.css';

const state = reactive({
  text: '',
  theme: 'light',
})

config({
  editorConfig: {
    renderDelay: 0,
    zIndex: 3000
  }
})
</script>