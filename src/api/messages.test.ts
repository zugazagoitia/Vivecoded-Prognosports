import { describe, expect, it } from 'vitest'
import { ApiError, genericMessage } from './errors'
import { messageFor } from './messages'

const http = (status: number, msg?: string) =>
  new ApiError(status, undefined, msg ?? genericMessage(status))

describe('messageFor', () => {
  it('network down', () => {
    expect(messageFor(new ApiError(0, undefined, 'x', 'network'))).toBe(
      'Ha fallado la conexión con el servidor.',
    )
  })
  it('maps by status when the API has no message', () => {
    expect(messageFor(http(401))).toContain('sesión ha caducado')
    expect(messageFor(http(403))).toBe('No tienes permiso para hacer esto.')
    expect(messageFor(http(404))).toBe('No se ha encontrado lo que buscabas')
    expect(messageFor(http(500))).toBe('Algo ha fallado en el servidor. Inténtalo de nuevo.')
    expect(messageFor(http(503))).toBe('Algo ha fallado en el servidor. Inténtalo de nuevo.')
  })
  it('uses the API message when present', () => {
    expect(messageFor(http(422, 'El plazo ya ha cerrado.'))).toBe('El plazo ya ha cerrado.')
    expect(messageFor(http(409, 'Ya existe.'))).toBe('Ya existe.')
    expect(messageFor(http(500, 'Mantenimiento en curso.'))).toBe('Mantenimiento en curso.')
  })
  it('falls back for unknown errors', () => {
    expect(messageFor(new Error('boom'))).toContain('Algo ha salido mal')
  })
})
