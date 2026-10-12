/** Design showcase routes (`/fundamentos`, `/dev/*`): not part of the product. */
export function isShowcasePath(path: string): boolean {
  return path === '/fundamentos' || path === '/dev' || path.startsWith('/dev/')
}

/** On in dev, in beta builds and in the e2e build (`VITE_SHOWCASE=true`); off in production. */
export function showcaseEnabled(
  env: { DEV?: boolean; MODE?: string; VITE_SHOWCASE?: string } = import.meta.env,
): boolean {
  return Boolean(env.DEV) || env.MODE === 'beta' || env.VITE_SHOWCASE === 'true'
}
