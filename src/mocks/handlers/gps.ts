import { http } from 'msw'
import { fail, ok } from '../envelope'
import { grandPrixes, nextGrandPrix } from '../fixtures'

export const gpHandlers = [
  http.get('*/v2/gps', () => ok(grandPrixes)),
  http.get('*/v2/gps/:competition/next', () => {
    const gp = nextGrandPrix()
    return gp ? ok(gp) : fail(404, 'No hay próximo Gran Premio.')
  }),
  http.get('*/v2/gps/:competition/:season', () => ok(grandPrixes)),
  http.get('*/v2/gps/:id', ({ params }) => {
    const gp = grandPrixes.find((g) => String(g.id) === params.id)
    return gp ? ok(gp) : fail(404, 'Gran Premio no encontrado.')
  }),
]
