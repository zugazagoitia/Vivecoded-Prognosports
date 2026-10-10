import { iconFor, type IconName } from '@/components/ui/icons'

export type AdminItemId =
  | 'panel'
  | 'gps'
  | 'calculos'
  | 'circuitos'
  | 'pilotos'
  | 'reglas'
  | 'usuarios'
  | 'comunidades'
  | 'notificaciones'

export interface AdminItem {
  id: AdminItemId
  /** i18n key under `admin.nav.items`. */
  label: string
  icon: IconName
  /** Section root; also the prefix that marks the item active for nested routes. */
  to: string
}

export interface AdminGroup {
  id: string
  /** i18n key under `admin.nav.groups`. */
  label: string
  items: AdminItem[]
}

function item(id: AdminItemId, icon: string, to: string): AdminItem {
  return { id, label: `admin.nav.items.${id}`, icon: iconFor(icon), to }
}

/**
 * Admin menu (N4 / AdminSide.dc.html). Screens: panel M1; gps M2-M5; calculos M13;
 * circuitos M6-M7; pilotos M8; reglas M9; usuarios M10; comunidades M11; notificaciones M12.
 * Only M1 and M2 exist as pages today: the other targets fall into the 404 until built.
 */
export const ADMIN_GROUPS: AdminGroup[] = [
  {
    id: 'general',
    label: 'admin.nav.groups.general',
    items: [item('panel', 'dashboard', '/admin')],
  },
  {
    id: 'temporada',
    label: 'admin.nav.groups.temporada',
    items: [item('gps', 'flag', '/admin/gps'), item('calculos', 'calculate', '/admin/calculos')],
  },
  {
    id: 'catalogo',
    label: 'admin.nav.groups.catalogo',
    items: [
      item('circuitos', 'route', '/admin/circuitos'),
      item('pilotos', 'sports_motorsports', '/admin/pilotos'),
      item('reglas', 'rule', '/admin/reglas'),
    ],
  },
  {
    id: 'personas',
    label: 'admin.nav.groups.personas',
    items: [
      item('usuarios', 'person', '/admin/usuarios'),
      item('comunidades', 'groups', '/admin/comunidades'),
      item('notificaciones', 'campaign', '/admin/notificaciones'),
    ],
  },
]

export const ADMIN_ITEMS: AdminItem[] = ADMIN_GROUPS.flatMap((g) => g.items)

/** Item marked active for a route path (`/admin/gps/:id/sesiones` -> gps); null outside admin. */
export function activeAdminItem(path: string): AdminItem | null {
  const clean = path.replace(/\/+$/, '') || '/'
  if (clean === '/admin') return ADMIN_ITEMS[0] ?? null
  return (
    ADMIN_ITEMS.find((i) => i.id !== 'panel' && (clean === i.to || clean.startsWith(`${i.to}/`))) ??
    null
  )
}
