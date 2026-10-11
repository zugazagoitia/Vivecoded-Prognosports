/**
 * Legal texts (P6, #28). BORRADOR pendiente de revisión legal: edit ONLY this file to change
 * the texts. Anything written as `[TEXTO]` is rendered as a highlighted placeholder (`span.ph`)
 * until it is replaced by the confirmed value.
 */

export type LegalTab = 'terms' | 'privacy'

export interface LegalSection {
  id: string
  title: string
  paragraphs: string[]
}

export interface LegalDoc {
  /** Page title / h1 / breadcrumb. */
  title: string
  sections: LegalSection[]
}

/** Values to confirm. Replace the bracketed text (or set `updatedAt` to an ISO date). */
export const LEGAL_PENDING = {
  /** ISO date (YYYY-MM-DD) of the last update; `null` shows the placeholder. */
  updatedAt: null as string | null,
  updatedAtPlaceholder: '[FECHA]',
  controller: '[DATOS DEL RESPONSABLE]',
  minAge: '[EDAD MÍNIMA]',
  contactEmail: '[CORREO DE CONTACTO]',
  providers: '[CONFIRMAR LISTA DE PROVEEDORES]',
}

const P = LEGAL_PENDING

export const LEGAL: Record<LegalTab, LegalDoc> = {
  terms: {
    title: 'Términos de uso',
    sections: [
      {
        id: 'quienes-somos',
        title: '1. Quiénes somos',
        paragraphs: [
          `${P.controller} PrognoSports es un servicio gratuito para pronosticar resultados de carreras entre amigos. No es una casa de apuestas ni ofrece premios en dinero.`,
        ],
      },
      {
        id: 'tu-cuenta',
        title: '2. Tu cuenta',
        paragraphs: [
          `Eres responsable de la contraseña y de lo que se haga con tu cuenta. Debes tener la edad mínima de uso: ${P.minAge}.`,
          'Debes facilitar un correo electrónico válido y mantener tus datos al día.',
        ],
      },
      {
        id: 'convivencia',
        title: '3. Reglas de convivencia',
        paragraphs: [
          'Los nombres, imágenes y descripciones de comunidades y perfiles deben respetar a los demás. Podemos retirar contenido que no lo haga.',
          'No está permitido suplantar a otras personas, acosar, intentar acceder a cuentas o datos ajenos ni alterar el funcionamiento del servicio.',
        ],
      },
      {
        id: 'puntos',
        title: '4. Puntos y rankings',
        paragraphs: [
          'Los puntos los calcula la plataforma según las reglas de cada comunidad. Si hay un error, lo corregiremos y recalcularemos los puntos afectados.',
        ],
      },
      {
        id: 'cambios',
        title: '5. Cambios en el servicio',
        paragraphs: [
          'PrognoSports está en beta: puede cambiar o dejar de estar disponible. Avisaremos de los cambios importantes.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Política de privacidad',
    sections: [
      {
        id: 'datos',
        title: '1. Qué datos guardamos',
        paragraphs: [
          'Nombre de usuario, correo, contraseña cifrada, tus pronósticos y, si lo añades, imagen, biografía, localización y zona horaria.',
        ],
      },
      {
        id: 'uso',
        title: '2. Para qué los usamos',
        paragraphs: [
          'Para que funcione el juego, enviarte los avisos que elijas por correo o Telegram y calcular rankings.',
        ],
      },
      {
        id: 'terceros',
        title: '3. Con quién los compartimos',
        paragraphs: [
          'Los miembros de tus comunidades ven tu nombre, tu avatar y tus puntos. No vendemos datos.',
          `Proveedores: Cloudflare (alojamiento de la aplicación y, solo si se activa, analítica web sin cookies) y Sentry (registro de errores, solo si se activa, sin datos personales). ${P.providers}`,
        ],
      },
      {
        id: 'derechos',
        title: '4. Tus derechos',
        paragraphs: [
          `Puedes acceder, corregir o pedir la eliminación de tus datos escribiendo a ${P.contactEmail}.`,
        ],
      },
      {
        id: 'cookies',
        title: '5. Cookies y almacenamiento',
        paragraphs: [
          'Guardamos tu sesión y tu preferencia de tema en el navegador. No usamos cookies publicitarias ni de seguimiento.',
        ],
      },
    ],
  },
}

export interface LegalSegment {
  text: string
  /** True for `[PLACEHOLDER]` segments (brackets included in `text`). */
  ph: boolean
}

/** Splits `[TEXTO]` placeholders from plain text. Never interprets HTML: output is rendered as text nodes. */
export function legalSegments(text: string): LegalSegment[] {
  const out: LegalSegment[] = []
  for (const part of text.split(/(\[[^\]]+\])/)) {
    if (part) out.push({ text: part, ph: /^\[[^\]]+\]$/.test(part) })
  }
  return out
}

export function legalTabFromRoute(path: string): 0 | 1 {
  return path.replace(/\/+$/, '') === '/privacy' ? 1 : 0
}

export const LEGAL_TAB_ORDER: LegalTab[] = ['terms', 'privacy']

export function legalUpdatedLabel(): string {
  if (!P.updatedAt) return P.updatedAtPlaceholder
  const d = new Date(`${P.updatedAt}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return P.updatedAtPlaceholder
  return d.toLocaleDateString('es-ES', { dateStyle: 'long', timeZone: 'UTC' })
}
