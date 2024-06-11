<template>
  <MdEditor v-model="state.text" :theme="state.theme"/>
</template>

<script setup>
import { reactive  } from 'vue';
import screenfull from 'screenfull'
import { MdEditor, config  } from 'md-editor-v3';
import 'md-editor-v3/lib/style.css';

// const text = ref('# Hello Editor');
const state = reactive({
  text: '',
  theme: 'dark',
})

config({
  editorExtensions: {
    screenfull: {
      instance: screenfull
    }
  }
})
</script>