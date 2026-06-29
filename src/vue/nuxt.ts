import { defineNuxtModule, addComponent, addImports } from '@nuxt/kit';
import { resolveModuleSetup, type VSurferModuleOptions } from './nuxt-config';

export type { VSurferModuleOptions };

export default defineNuxtModule<VSurferModuleOptions>({
  meta: { name: 'v-surfer', configKey: 'vSurfer' },
  defaults: { css: true, components: true, prefix: 'Surfer', effects: 'all' },
  setup(options, nuxt) {
    const { css, components, imports } = resolveModuleSetup(options);
    // CSS via nuxt.options.css → linked in <head> at SSR time (no FOUC).
    for (const sheet of css) nuxt.options.css.push(sheet);
    for (const component of components) addComponent(component);
    // Auto-import the module objects so `:modules="[NavigationModule]"` needs no import.
    for (const imp of imports) addImports(imp);
  },
});
