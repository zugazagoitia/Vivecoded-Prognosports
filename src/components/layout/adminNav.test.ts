import { describe, expect, it } from 'vitest'
import { activeAdminItem } from './adminNav'

const id = (p: string) => activeAdminItem(p)?.id ?? null

describe('activeAdminItem', () => {
  it.each([
    ['/admin', 'panel'], // M1
    ['/admin/', 'panel'],
    ['/admin/gps', 'gps'], // M2
    ['/admin/gps/nuevo', 'gps'], // M3
    ['/admin/gps/f1/2026/singapur', 'gps'], // M4
    ['/admin/gps/f1/2026/singapur/sesiones', 'gps'], // M5
    ['/admin/gps/7/sesiones', 'gps'],
    ['/admin/gps/f1/2026/singapur/pilotos', 'gps'],
    ['/admin/circuitos', 'circuitos'], // M6
    ['/admin/circuitos/nuevo', 'circuitos'], // M7
    ['/admin/circuitos/12', 'circuitos'],
    ['/admin/pilotos', 'pilotos'], // M8
    ['/admin/pilotos/3', 'pilotos'],
    ['/admin/reglas', 'reglas'], // M9
    ['/admin/reglas/nuevo', 'reglas'],
    ['/admin/reglas/4', 'reglas'],
    ['/admin/usuarios', 'usuarios'], // M10
    ['/admin/comunidades', 'comunidades'], // M11
    ['/admin/notificaciones', 'notificaciones'], // M12
    ['/admin/calculos', 'calculos'], // M13
  ])('%s -> %s', (path, expected) => {
    expect(id(path)).toBe(expected)
  })

  it('is null outside admin and for unknown sections', () => {
    expect(id('/home')).toBeNull()
    expect(id('/administrador')).toBeNull()
    expect(id('/admin/otra')).toBeNull()
  })

  it('does not confuse prefixes', () => {
    expect(id('/admin/gpsx')).toBeNull()
  })
})
