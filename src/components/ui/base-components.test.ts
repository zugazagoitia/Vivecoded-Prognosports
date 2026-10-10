import { render, screen, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { useForm } from 'vee-validate'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { z } from 'zod'
import { i18n } from '@/i18n'
import { toTypedSchema } from '@/lib/zod-form'
import { createMemoryHistory, createRouter } from 'vue-router'
import Breadcrumb from './Breadcrumb.vue'
import Chip from './Chip.vue'
import Countdown from './Countdown.vue'
import DriverRow from './DriverRow.vue'
import Menu from './Menu.vue'
import PButton from './PButton.vue'
import PInput from './PInput.vue'
import PNumberInput from './PNumberInput.vue'
import PPagination from './PPagination.vue'
import PSwitch from './PSwitch.vue'
import PTable from './PTable.vue'
import PTabs from './PTabs.vue'
import PTooltip from './PTooltip.vue'
import PrognoModal from './PrognoModal.vue'
import SegmentedControl from './SegmentedControl.vue'
import type { PTableColumn } from './tableFeatures'
import { textColorFor } from './textColor'
import ComponentsPage from '@/pages/dev/componentes.vue'

// jsdom lacks what Reka UI (floating-ui, focus scope) expects.
beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  Object.assign(Element.prototype, {
    hasPointerCapture: () => false,
    setPointerCapture: () => {},
    releasePointerCapture: () => {},
    scrollIntoView: () => {},
  })
})

afterEach(() => vi.restoreAllMocks())

const global = { plugins: [i18n] }
const user = () => userEvent.setup({ delay: null })

describe('textColorFor', () => {
  it('picks readable text for team colours', () => {
    expect(textColorFor('#b4b4b4')).toBe('dark')
    expect(textColorFor('#3671c6')).toBe('white')
    expect(textColorFor('#fff')).toBe('dark')
    expect(textColorFor('#000')).toBe('white')
  })
})

describe('PButton', () => {
  it('loading disables the button and shows «Guardando...»', () => {
    render(PButton, { global, slots: { default: 'Guardar' }, props: { loading: true } })
    const btn = screen.getByRole('button', { name: 'Guardando...' })
    expect(btn).toHaveProperty('disabled', true)
    expect(btn.getAttribute('aria-busy')).toBe('true')
    expect(screen.queryByText('Guardar')).toBeNull()
  })

  it('iconOnly without aria-label warns in development', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(PButton, { global, props: { iconOnly: true, icon: 'plus' } })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('aria-label'))
  })

  it('iconOnly with aria-label has an accessible name and does not warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(PButton, {
      global,
      props: { iconOnly: true, icon: 'plus' },
      attrs: { 'aria-label': 'Añadir' },
    })
    expect(screen.getByRole('button', { name: 'Añadir' })).toBeTruthy()
    expect(warn).not.toHaveBeenCalled()
  })

  it('emits click, and ignores it when disabled', async () => {
    const onClick = vi.fn()
    const view = render(PButton, { global, slots: { default: 'Ok' }, attrs: { onClick } })
    await user().click(screen.getByRole('button', { name: 'Ok' }))
    expect(onClick).toHaveBeenCalledTimes(1)
    await view.rerender({ disabled: true })
    await user().click(screen.getByRole('button', { name: 'Ok' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders an anchor with href and a RouterLink with to', () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/:p(.*)*', component: { render: () => null } }],
    })
    render(
      defineComponent({
        render: () =>
          h('div', [h(PButton, { href: '/x' }, () => 'A'), h(PButton, { to: '/y' }, () => 'B')]),
      }),
      { global: { plugins: [i18n, router] } },
    )
    expect(screen.getByRole('link', { name: 'A' }).getAttribute('href')).toBe('/x')
    expect(screen.getByRole('link', { name: 'B' }).getAttribute('href')).toBe('/y')
  })
})

describe('form fields', () => {
  it('PInput links label, help and error (aria-invalid, aria-describedby)', () => {
    render(PInput, {
      global,
      props: { label: 'Nombre', help: 'Ayuda', error: 'Obligatorio', modelValue: '' },
    })
    const input = screen.getByLabelText('Nombre')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    const described = (input.getAttribute('aria-describedby') ?? '').split(' ')
    expect(described.map((id) => document.getElementById(id)?.textContent?.trim())).toEqual([
      'Obligatorio',
      'Ayuda',
    ])
  })

  it('PInput updates its v-model', async () => {
    const onUpdate = vi.fn()
    render(PInput, {
      global,
      props: { label: 'Buscar', modelValue: '', 'onUpdate:modelValue': onUpdate },
    })
    await user().type(screen.getByLabelText('Buscar'), 'ab')
    expect(onUpdate).toHaveBeenLastCalledWith('ab')
  })

  it('PNumberInput steps with named buttons and respects the bounds', async () => {
    const Host = defineComponent({
      setup() {
        const v = ref<number | null>(24)
        return () =>
          h(PNumberInput, {
            label: 'Puntos',
            max: 25,
            min: 0,
            modelValue: v.value,
            'onUpdate:modelValue': (n: number | null) => (v.value = n),
          })
      },
    })
    render(Host, { global })
    const u = user()
    await u.click(screen.getByRole('button', { name: 'Aumentar' }))
    expect(screen.getByLabelText<HTMLInputElement>('Puntos').value).toBe('25')
    expect(screen.getByRole('button', { name: 'Aumentar' })).toHaveProperty('disabled', true)
  })

  it('PSwitch is a switch with aria-checked', async () => {
    render(PSwitch, { global, props: { label: 'Avisos', modelValue: false } })
    const sw = screen.getByRole('switch', { name: 'Avisos' })
    expect(sw.getAttribute('aria-checked')).toBe('false')
    await user().click(sw)
    expect(sw.getAttribute('aria-checked')).toBe('true')
  })

  it('works with VeeValidate + Zod through the typed-schema adapter', async () => {
    const Host = defineComponent({
      setup() {
        const { defineField, errors } = useForm({
          validationSchema: toTypedSchema(z.object({ nombre: z.string().min(3, 'Muy corto') })),
          initialValues: { nombre: 'ab' },
          validateOnMount: true,
        })
        const [nombre] = defineField('nombre')
        return () =>
          h(PInput, {
            label: 'Nombre',
            modelValue: nombre.value,
            'onUpdate:modelValue': (v: string) => (nombre.value = v),
            error: errors.value.nombre,
          })
      },
    })
    render(Host, { global })
    expect(await screen.findByText('Muy corto')).toBeTruthy()
    await user().type(screen.getByLabelText('Nombre'), 'c')
    await vi.waitFor(() => expect(screen.queryByText('Muy corto')).toBeNull())
  })
})

describe('SegmentedControl, Chip, PTabs', () => {
  const options = [
    { value: 'a', label: 'Acumulado' },
    { value: 'b', label: 'Ritmo' },
  ]

  it('SegmentedControl reflects aria-pressed and emits update:modelValue', async () => {
    const onUpdate = vi.fn()
    render(SegmentedControl, {
      global,
      props: { options, label: 'Lectura', modelValue: 'a', 'onUpdate:modelValue': onUpdate },
    })
    const group = screen.getByRole('group', { name: 'Lectura' })
    expect(
      within(group).getByRole('button', { name: 'Acumulado' }).getAttribute('aria-pressed'),
    ).toBe('true')
    const b = within(group).getByRole('button', { name: 'Ritmo' })
    expect(b.getAttribute('aria-pressed')).toBe('false')
    await user().click(b)
    expect(onUpdate).toHaveBeenCalledWith('b')
  })

  it('SegmentedControl moves focus with the arrow keys', async () => {
    render(SegmentedControl, { global, props: { options, label: 'Lectura', modelValue: 'a' } })
    const u = user()
    await u.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Acumulado' }))
    await u.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Ritmo' }))
  })

  it('Chip toggles aria-pressed', async () => {
    const Host = defineComponent({
      setup() {
        const on = ref(false)
        return () =>
          h(
            Chip,
            { modelValue: on.value, 'onUpdate:modelValue': (v: boolean) => (on.value = v) },
            () => 'Amigos',
          )
      },
    })
    render(Host, { global })
    const chip = screen.getByRole('button', { name: 'Amigos' })
    expect(chip.getAttribute('aria-pressed')).toBe('false')
    await user().click(chip)
    expect(chip.getAttribute('aria-pressed')).toBe('true')
  })

  it('PTabs exposes tablist/tab/tabpanel and moves with the arrow keys', async () => {
    const Host = defineComponent({
      setup() {
        const tab = ref('uno')
        return () =>
          h(
            PTabs,
            {
              modelValue: tab.value,
              'onUpdate:modelValue': (v: string) => (tab.value = v),
              label: 'Secciones',
              tabs: [
                { value: 'uno', label: 'Uno' },
                { value: 'dos', label: 'Dos' },
              ],
            },
            { uno: () => 'Panel uno', dos: () => 'Panel dos' },
          )
      },
    })
    render(Host, { global })
    expect(screen.getByRole('tablist', { name: 'Secciones' })).toBeTruthy()
    const uno = screen.getByRole('tab', { name: 'Uno' })
    expect(uno.getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tabpanel').textContent).toContain('Panel uno')
    const u = user()
    uno.focus()
    await u.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Dos' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tabpanel').textContent).toContain('Panel dos')
  })
})

describe('data components', () => {
  it('PPagination shows the range, aria-current and Anterior/Siguiente', async () => {
    const Host = defineComponent({
      setup() {
        const p = ref(1)
        return () =>
          h(PPagination, {
            modelValue: p.value,
            'onUpdate:modelValue': (v: number) => (p.value = v),
            total: 12,
            perPage: 4,
          })
      },
    })
    render(Host, { global })
    expect(screen.getByText('Mostrando de 1 a 4 de un total de 12 resultados')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Anterior' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Página 1' }).getAttribute('aria-current')).toBe(
      'page',
    )
    await user().click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(screen.getByRole('button', { name: 'Página 2' }).getAttribute('aria-current')).toBe(
      'page',
    )
    expect(screen.getByText('Mostrando de 5 a 8 de un total de 12 resultados')).toBeTruthy()
  })

  it('PTable sorts accessibly (aria-sort) and highlights my row', async () => {
    interface R {
      n: string
      p: number
    }
    const columns: PTableColumn<R>[] = [
      { accessorKey: 'n', header: 'Jugador' },
      { accessorKey: 'p', header: 'Puntos', meta: { align: 'right' } },
    ]
    render(PTable<R>, {
      global,
      props: {
        columns,
        caption: 'Clasificación',
        data: [
          { n: 'Ana', p: 10 },
          { n: 'Tú', p: 30 },
          { n: 'Bea', p: 20 },
        ],
        isMine: (r: R) => r.n === 'Tú',
      },
    })
    const th = screen.getByRole('columnheader', { name: /Puntos/ })
    expect(th.getAttribute('aria-sort')).toBe('none')
    await user().click(within(th).getByRole('button'))
    expect(th.getAttribute('aria-sort')).toBe('ascending')
    await user().click(within(th).getByRole('button'))
    expect(th.getAttribute('aria-sort')).toBe('descending')
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows.map((r) => r.textContent?.replace(/\s+/g, ''))).toEqual(['Tú30', 'Bea20', 'Ana10'])
    expect(screen.getByRole('table', { name: 'Clasificación' })).toBeTruthy()
    expect(screen.getByText('Tú').closest('tr')?.getAttribute('aria-current')).toBe('true')
  })

  it('Countdown has a summarised accessible label and aria-live off', () => {
    render(Countdown, {
      global,
      props: { target: '2026-03-08T16:00:00Z', now: '2026-03-07T12:00:00Z' },
    })
    const timer = screen.getByRole('timer')
    expect(timer.getAttribute('aria-label')).toBe('Cierra en 1 día y 4 horas')
    expect(timer.getAttribute('aria-live')).toBe('off')
  })

  it('Countdown reports closed', () => {
    render(Countdown, {
      global,
      props: { target: '2026-03-01T00:00:00Z', now: '2026-03-07T12:00:00Z' },
    })
    expect(screen.getByRole('timer').getAttribute('aria-label')).toBe('Cerrado')
  })

  it('DriverRow picks dark or light dorsal text from the team colour', () => {
    render(DriverRow, {
      global,
      props: { number: 44, name: 'Lewis', team: 'Ferrari', color: '#b4b4b4', code: 'HAM' },
    })
    expect(screen.getByText('44').className).toContain('text-black')
    render(DriverRow, {
      global,
      props: { number: 1, name: 'Max', team: 'Red Bull', color: '#3671c6' },
    })
    expect(screen.getByText('1').className).toContain('text-white')
  })

  it('Breadcrumb marks the last item as the current page', () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/:p(.*)*', component: { render: () => null } }],
    })
    render(Breadcrumb, {
      global: { plugins: [i18n, router] },
      props: { items: [{ label: 'Inicio', to: '/' }, { label: 'Ajustes' }] },
    })
    expect(screen.getByRole('navigation', { name: 'Migas de pan' })).toBeTruthy()
    expect(screen.getByText('Ajustes').getAttribute('aria-current')).toBe('page')
  })
})

describe('overlays', () => {
  it('PTooltip opens on keyboard focus, closes with Escape and never uses title', async () => {
    render(PTooltip, {
      global,
      props: { content: 'Ayuda del botón' },
      slots: { default: '<button type="button">Info</button>' },
    })
    const trigger = screen.getByRole('button', { name: 'Info' })
    expect(trigger.hasAttribute('title')).toBe(false)
    await user().tab()
    expect(await screen.findByRole('tooltip')).toBeTruthy()
    expect(trigger.getAttribute('aria-describedby')).toBeTruthy()
    await user().keyboard('{Escape}')
    await vi.waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull())
  })

  it('Menu opens with the keyboard, navigates with arrows and closes with Escape', async () => {
    const onSelect = vi.fn()
    render(Menu, {
      global,
      attrs: { onSelect },
      props: {
        entries: [
          { type: 'label', label: 'Cuenta' },
          { value: 'perfil', label: 'Perfil', active: true },
          { type: 'separator' },
          { value: 'salir', label: 'Salir' },
        ],
      },
      slots: { trigger: '<button type="button">Menú</button>' },
    })
    const u = user()
    await u.tab()
    await u.keyboard('{ArrowDown}')
    expect(await screen.findByRole('menu')).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: 'Perfil' }).getAttribute('aria-current')).toBe(
      'true',
    )
    await u.keyboard('{ArrowDown}')
    await u.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalled()
    await vi.waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
    screen.getByRole('button', { name: 'Menú' }).focus()
    await u.keyboard('{ArrowDown}')
    expect(await screen.findByRole('menu')).toBeTruthy()
    await u.keyboard('{Escape}')
    await vi.waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
  })

  const ModalHost = defineComponent({
    props: { destructive: Boolean },
    emits: ['confirm'],
    setup(props, { emit }) {
      const open = ref(false)
      return () =>
        h('div', [
          h('button', { type: 'button', onClick: () => (open.value = true) }, 'Abrir'),
          h(
            PrognoModal,
            {
              open: open.value,
              'onUpdate:open': (v: boolean) => (open.value = v),
              title: 'Eliminar comunidad',
              description: 'No se puede deshacer',
              destructive: props.destructive,
              confirmLabel: 'Eliminar',
              onConfirm: () => emit('confirm'),
            },
            () => 'Cuerpo',
          ),
        ])
    },
  })

  it('PrognoModal traps focus, closes with Escape and returns focus to the trigger', async () => {
    render(ModalHost, { global })
    const u = user()
    const trigger = screen.getByRole('button', { name: 'Abrir' })
    await u.click(trigger)
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar comunidad' })
    expect(dialog.contains(document.activeElement)).toBe(true)
    for (let i = 0; i < 6; i++) await u.tab()
    expect(dialog.contains(document.activeElement)).toBe(true)
    await u.keyboard('{Escape}')
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(trigger)
  })

  it('destructive PrognoModal offers Cancelar and a danger confirm', async () => {
    const onConfirm = vi.fn()
    render(ModalHost, { global, props: { destructive: true }, attrs: { onConfirm } })
    await user().click(screen.getByRole('button', { name: 'Abrir' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toBeTruthy()
    await user().click(within(dialog).getByRole('button', { name: 'Eliminar' }))
    expect(onConfirm).toHaveBeenCalled()
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
})

describe('accessibility guards', () => {
  it('every button in the catalogue page has an accessible name', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/:p(.*)*', component: { render: () => null } }],
    })
    const { createPinia } = await import('pinia')
    render(ComponentsPage, { global: { plugins: [i18n, router, createPinia()] } })
    const all = screen.getAllByRole('button')
    const named = screen.getAllByRole('button', { name: /\S/ })
    expect(all.length).toBeGreaterThan(20)
    expect(named.length).toBe(all.length)
  })

  it('no component implements a tooltip with the title attribute', () => {
    const sources = import.meta.glob<string>('./*.vue', {
      query: '?raw',
      import: 'default',
      eager: true,
    })
    const offenders = Object.entries(sources)
      .filter(([, src]) => /<[a-z][^>]*\s:?title=/.test(src))
      .map(([file]) => file)
    expect(Object.keys(sources).length).toBeGreaterThan(20)
    expect(offenders).toEqual([])
  })
})
