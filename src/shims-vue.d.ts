// Lets plain-TS tooling (typescript-eslint) resolve `.vue` imports; vue-tsc uses the real types.
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}
