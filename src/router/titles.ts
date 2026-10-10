import type { Router } from 'vue-router'

/** Fallback Spanish titles until T5 (i18n) lands; `setTitleResolver` swaps in `t()`. */
const fallback: Record<string, string> = {
  'route.landing': 'Inicio',
  'route.login': 'Iniciar sesión',
  'route.register': 'Crear cuenta',
  'route.recover': 'Recuperar contraseña',
  'route.reset': 'Restablecer contraseña',
  'route.verify': 'Verificar correo',
  'route.home': 'Inicio',
  'route.gp': 'Gran Premio',
  'route.predict': 'Pronosticar',
  'route.ranking': 'Clasificación',
  'route.communities': 'Comunidades',
  'route.community': 'Comunidad',
  'route.user': 'Perfil',
  'route.admin': 'Administración',
  'route.adminGps': 'Administración · Grandes Premios',
  'route.notFound': 'No se ha encontrado',
  'route.tokens': 'Fundamentos',
  'route.graficos': 'Gráficos',
  'route.loggedOut': 'Has cerrado sesión',
}

let resolve: (key: string) => string = (key) => fallback[key] ?? key

export function setTitleResolver(fn: (key: string) => string): void {
  resolve = fn
}

export const APP_NAME = 'PrognoSports'

export function installTitles(router: Router): void {
  router.afterEach((to) => {
    const key = to.meta.title
    document.title = key ? `${resolve(key)} · ${APP_NAME}` : APP_NAME
  })
}
