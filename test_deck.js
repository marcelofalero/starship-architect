const { createPinia, defineStore } = require('pinia');
const { createApp, ref, computed } = require('vue');
// this is hard to mock because we don't have a headless browser.
