import { fireEvent, screen } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import { RouterView } from 'vue-router'
import { defineComponent, h, ref } from 'vue'
import { useHighlight } from '@/composables/useHighlight'
import { useUnsavedChanges } from '@/composables/useUnsavedChanges'
import { renderWithProviders } from '@/test/render'
import BottomSheet from './BottomSheet.vue'
import ConfirmLeaveDialog from './ConfirmLeaveDialog.vue'
import FormChips from './FormChips.vue'
import HitCell from './HitCell.vue'
import PlayerChip from './PlayerChip.vue'
import PredictionSlot from './PredictionSlot.vue'
import SaveBar from './SaveBar.vue'
import ValidationList from './ValidationList.vue'

describe('useHighlight', () => {
  it('evicts the oldest when a sixth is added and ignores removing "me"', () => {
    const hl = useHighlight('me')
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f']) hl.add(id)
    expect(hl.highlighted.value).toEqual(['me', 'b', 'c', 'd', 'e', 'f'])
    hl.remove('me')
    expect(hl.isOn('me')).toBe(true)
    expect(hl.highlighted.value).toHaveLength(6)
  })

  it('keeps each colour with its player while others come and go', () => {
    const hl = useHighlight('me')
    hl.add('a')
    hl.add('b')
    hl.add('c')
    const before = hl.colorOf('c')
    hl.remove('a')
    hl.add('d')
    expect(hl.colorOf('c')).toBe(before)
    expect(hl.colorOf('b')).toBe('series-3')
    expect(hl.colorOf('d')).toBe('series-2')
    expect(hl.colorOf('me')).toBe('series-you')
  })
})

describe('FormChips', () => {
  it('marks win, podium and the rest', async () => {
    const { container } = await renderWithProviders(FormChips, {
      props: { places: [1, 3, 7, 2, 5] },
    })
    const kinds = [...container.querySelectorAll('[data-kind]')].map((e) =>
      e.getAttribute('data-kind'),
    )
    expect(kinds).toEqual(['won', 'podium', 'rest', 'podium', 'rest'])
  })
  it('names chips and movement for assistive tech, with a dash for no movement', async () => {
    await renderWithProviders(FormChips, {
      props: {
        places: [1, 3, 7, 2, 5],
        move: 2,
        gps: ['Bahréin', 'Miami', 'Mónaco', 'España', 'Italia'],
      },
    })
    expect(screen.getByLabelText('GP de Italia: 5.º')).toBeTruthy()
    expect(screen.getByText('Sube 2 puestos')).toBeTruthy()
  })
  it('shows a dash for move=0', async () => {
    await renderWithProviders(FormChips, { props: { places: [1, 2, 3, 4, 5], move: 0 } })
    expect(screen.getByText('—')).toBeTruthy()
    expect(screen.getByText('Sin cambios de puesto')).toBeTruthy()
  })
})

describe('HitCell', () => {
  it('hidden does not expose the driver anywhere in the DOM', async () => {
    const { container } = await renderWithProviders(HitCell, {
      props: { kind: 'hidden', label: 'NOR' },
    })
    expect(container.innerHTML).not.toContain('NOR')
    expect(container.textContent).toBe('•••')
  })
  it('has a full accessible name', async () => {
    await renderWithProviders(HitCell, { props: { kind: 'exact', label: 'NOR' } })
    expect(screen.getByRole('img', { name: 'NOR, exacto, 5 puntos' })).toBeTruthy()
  })
  it('singular points', async () => {
    await renderWithProviders(HitCell, { props: { kind: 'far', label: 'LEC' } })
    expect(screen.getByRole('img', { name: 'LEC, a dos posiciones, 1 punto' })).toBeTruthy()
  })
})

describe('ValidationList', () => {
  it('gives each line an icon-independent state word', async () => {
    await renderWithProviders(ValidationList, {
      props: { items: [{ label: 'Falta la fecha', state: 'err' }] },
    })
    expect(screen.getByRole('list')).toBeTruthy()
    expect(screen.getByText('Error:')).toBeTruthy()
  })
})

describe('SaveBar', () => {
  it('is absent without changes and pluralises with them', async () => {
    const view = await renderWithProviders(SaveBar, { props: { count: 0 } })
    expect(screen.queryByRole('region')).toBeNull()
    await view.rerender({ count: 1 })
    expect(screen.getByText('Tienes 1 cambio sin guardar')).toBeTruthy()
    await view.rerender({ count: 3, saving: true, variant: 'surface' })
    expect(screen.getByText('Tienes 3 cambios sin guardar')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Guardando...' })).toBeTruthy()
  })
})

describe('PlayerChip', () => {
  it('exposes aria-pressed and emits toggle; "me" is locked', async () => {
    const view = await renderWithProviders(PlayerChip, {
      props: { player: { id: 'a', name: 'Ana' }, pressed: true },
    })
    const b = screen.getByRole('button', { name: 'Ana' })
    expect(b.getAttribute('aria-pressed')).toBe('true')
    await fireEvent.click(b)
    expect(view.emitted().toggle).toEqual([['a']])
  })
  it('locked chip never emits', async () => {
    const view = await renderWithProviders(PlayerChip, {
      props: { player: { id: 'me', name: 'Tú' }, locked: true },
    })
    await fireEvent.click(screen.getByRole('button'))
    expect(view.emitted().toggle).toBeUndefined()
  })
})

describe('PredictionSlot', () => {
  const driver = { code: 'NOR', name: 'Lando Norris' }
  it('labels filled and empty slots', async () => {
    await renderWithProviders(PredictionSlot, { props: { position: 3, driver } })
    expect(screen.getByRole('button', { name: '3.º Lando Norris' })).toBeTruthy()
  })
  it('empty slot is operable by keyboard', async () => {
    const view = await renderWithProviders(PredictionSlot, { props: { position: 3 } })
    const b = screen.getByRole('button', { name: '3.º vacío' })
    expect(b.getAttribute('tabindex')).toBe('0')
    await fireEvent.keyDown(b, { key: 'Enter' })
    expect(view.emitted().select).toHaveLength(1)
  })
  it('reorders and removes without dragging', async () => {
    const view = await renderWithProviders(PredictionSlot, {
      props: { position: 3, driver },
    })
    const b = screen.getByRole('button', { name: '3.º Lando Norris' })
    await fireEvent.keyDown(b, { key: 'ArrowUp', altKey: true })
    await fireEvent.keyDown(b, { key: 'ArrowDown', altKey: true })
    await fireEvent.keyDown(b, { key: 'Delete' })
    expect(view.emitted().moveUp).toHaveLength(1)
    expect(view.emitted().moveDown).toHaveLength(1)
    expect(view.emitted().remove).toHaveLength(1)
    await fireEvent.click(screen.getByRole('button', { name: 'Subir a Lando Norris un puesto' }))
    expect(view.emitted().moveUp).toHaveLength(2)
  })
})

describe('BottomSheet', () => {
  const Host = defineComponent({
    setup() {
      const open = ref(false)
      return () =>
        h('div', [
          h('button', { onClick: () => (open.value = true) }, 'Abrir'),
          h(
            BottomSheet,
            {
              open: open.value,
              title: 'Elegir piloto',
              always: true,
              'onUpdate:open': (v: boolean) => (open.value = v),
            },
            () => [h('button', 'Uno'), h('button', 'Dos')],
          ),
        ])
    },
  })

  it('moves focus in, traps Tab, closes with Escape and restores focus', async () => {
    const { user } = await renderWithProviders(Host)
    const trigger = screen.getByRole('button', { name: 'Abrir' })
    await user.click(trigger)
    const dialog = await screen.findByRole('dialog', { name: 'Elegir piloto' })
    await Promise.resolve()
    expect(dialog.contains(document.activeElement)).toBe(true)
    for (let i = 0; i < 6; i++) {
      await user.tab()
      expect(dialog.contains(document.activeElement)).toBe(true)
    }
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('closes from the scrim', async () => {
    const { user } = await renderWithProviders(Host)
    await user.click(screen.getByRole('button', { name: 'Abrir' }))
    await screen.findByRole('dialog')
    await user.click(screen.getAllByRole('button', { name: 'Cerrar selector', hidden: true })[0]!)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('useUnsavedChanges', () => {
  const Page = defineComponent({
    setup() {
      const dirty = ref(true)
      const g = useUnsavedChanges(dirty)
      return () => h(ConfirmLeaveDialog, { open: g.open.value, onStay: g.stay, onLeave: g.leave })
    },
  })
  const routes = [
    { path: '/a', component: Page },
    { path: '/b', component: { render: () => h('p', 'B') } },
  ]

  it('opens the in-page dialog on leave and navigates on Descartar', async () => {
    const { router, user } = await renderWithProviders(RouterView, { route: '/a', routes })
    const nav = router.push('/b')
    await screen.findByRole('dialog')
    expect(router.currentRoute.value.path).toBe('/a')
    await user.click(screen.getByRole('button', { name: 'Descartar y salir' }))
    await nav
    expect(router.currentRoute.value.path).toBe('/b')
  })

  it('stays when the user keeps editing', async () => {
    const { router, user } = await renderWithProviders(RouterView, { route: '/a', routes })
    const nav = router.push('/b')
    await screen.findByRole('dialog')
    await user.click(screen.getByRole('button', { name: 'Seguir editando' }))
    await nav
    expect(router.currentRoute.value.path).toBe('/a')
  })
})
