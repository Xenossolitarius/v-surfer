import vue from '@vitejs/plugin-vue';

// Per-playground config so the .vue SFC compiles.
// All other imports are relative paths into ../../src.
export default {
  plugins: [vue()],
};
