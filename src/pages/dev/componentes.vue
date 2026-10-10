<script setup lang="ts">
// Development-only catalogue of the F3 base components (unlisted, noindex via /dev/* header).
// Visual-regression and axe target. Copy here is demo content, not product copy.
import { useForm } from 'vee-validate'
import { computed, ref } from 'vue'
import { z } from 'zod'
import Avatar from '@/components/ui/Avatar.vue'
import Breadcrumb from '@/components/ui/Breadcrumb.vue'
import Chip from '@/components/ui/Chip.vue'
import Countdown from '@/components/ui/Countdown.vue'
import DriverRow from '@/components/ui/DriverRow.vue'
import Kpi from '@/components/ui/Kpi.vue'
import Menu, { type MenuEntry } from '@/components/ui/Menu.vue'
import Meter from '@/components/ui/Meter.vue'
import PButton from '@/components/ui/PButton.vue'
import PCard from '@/components/ui/PCard.vue'
import PCheckbox from '@/components/ui/PCheckbox.vue'
import PInput from '@/components/ui/PInput.vue'
import PNumberInput from '@/components/ui/PNumberInput.vue'
import PPage from '@/components/ui/PPage.vue'
import PPagination from '@/components/ui/PPagination.vue'
import PRadio from '@/components/ui/PRadio.vue'
import PRangeInput from '@/components/ui/PRangeInput.vue'
import PSelect from '@/components/ui/PSelect.vue'
import PStepper from '@/components/ui/PStepper.vue'
import PSwitch from '@/components/ui/PSwitch.vue'
import PTable from '@/components/ui/PTable.vue'
import PTabs from '@/components/ui/PTabs.vue'
import PTag from '@/components/ui/PTag.vue'
import PTextarea from '@/components/ui/PTextarea.vue'
import PTimeline from '@/components/ui/PTimeline.vue'
import PTimelineItem from '@/components/ui/PTimelineItem.vue'
import PTitle from '@/components/ui/PTitle.vue'
import PTooltip from '@/components/ui/PTooltip.vue'
import PrognoAlert from '@/components/ui/PrognoAlert.vue'
import PrognoModal from '@/components/ui/PrognoModal.vue'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import ThemeSwitch from '@/components/ui/ThemeSwitch.vue'
import type { PTableColumn } from '@/components/ui/tableFeatures'
import { toTypedSchema } from '@/lib/zod-form'
import { catalogDrivers } from '@/mocks/ui-catalog'

definePage({ meta: { layout: 'empty', title: 'route.componentes' } })

// Forms: VeeValidate + Zod
const schema = toTypedSchema(
  z.object({
    nombre: z.string().min(3, 'Escribe al menos 3 caracteres'),
    comunidad: z.string().min(1, 'Selecciona una opción'),
  }),
)
const { defineField, errors, handleSubmit } = useForm({
  validationSchema: schema,
  initialValues: { nombre: 'Al', comunidad: '' },
  validateOnMount: true,
})
const [nombre] = defineField('nombre')
const [comunidad] = defineField('comunidad')
const submit = handleSubmit(() => undefined)

const buscar = ref('')
const notas = ref('')
const puntos = ref<number | null>(10)
const confianza = ref(60)
const acepto = ref(true)
const noAcepto = ref(false)
const modo = ref('carrera')
const aviso = ref(true)
const avisoOff = ref(false)
const tab = ref('resumen')
const segment = ref('acumulado')
const chipA = ref(true)
const chipB = ref(false)
const page = ref(1)
const step = ref(1)
const modal = ref(false)
const confirmModal = ref(false)
const lastAction = ref('')

const opciones = [
  { value: 'madrid', label: 'Peñas de Madrid' },
  { value: 'sevilla', label: 'Amigos de Sevilla' },
]
const menu: MenuEntry[] = [
  { type: 'label', label: 'Cuenta' },
  { value: 'perfil', label: 'Perfil', icon: 'user', active: true },
  { value: 'ajustes', label: 'Ajustes', icon: 'gear' },
  { type: 'separator' },
  { value: 'salir', label: 'Cerrar sesión', icon: 'right-from-bracket' },
]
const tabs = [
  { value: 'resumen', label: 'Resumen', icon: 'list' as const },
  { value: 'pronosticos', label: 'Pronósticos' },
  { value: 'reglas', label: 'Reglas', disabled: true },
]
const steps = [{ label: 'Datos' }, { label: 'Pilotos' }, { label: 'Revisión' }]
const breadcrumb = [
  { label: 'Inicio', to: '/home' },
  { label: 'Comunidades', to: '/comunidades' },
  { label: 'Peñas de Madrid' },
]

interface Row {
  pos: number
  nombre: string
  puntos: number
  me?: boolean
}
const rows: Row[] = [
  { pos: 1, nombre: 'Lucía Pérez', puntos: 214 },
  { pos: 2, nombre: 'Tú', puntos: 198, me: true },
  { pos: 3, nombre: 'Marcos Ruiz', puntos: 187 },
  { pos: 4, nombre: 'Elena Gil', puntos: 143 },
]
const columns: PTableColumn<Row>[] = [
  { accessorKey: 'pos', header: '#', enableSorting: false },
  { accessorKey: 'nombre', header: 'Jugador' },
  { accessorKey: 'puntos', header: 'Puntos', meta: { align: 'right' } },
]
const closing = '2026-03-08T16:00:00Z'
const frozenNow = '2026-03-07T12:00:00Z'
const perPage = 4
const total = computed(() => 12)
</script>

<template>
  <div class="pg-main flex flex-col gap-8">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <PTitle>Catálogo de componentes</PTitle>
      <ThemeSwitch />
    </div>

    <PCard title="Botones">
      <div class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center gap-3">
          <PButton variant="primary">Principal</PButton>
          <PButton variant="soft">Suave</PButton>
          <PButton variant="outline">Contorno</PButton>
          <PButton variant="ghost">Fantasma</PButton>
          <PButton variant="danger">Peligro</PButton>
          <PButton variant="ok">Correcto</PButton>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <PButton size="sm" variant="outline">Pequeño</PButton>
          <PButton size="md" variant="outline">Mediano</PButton>
          <PButton size="lg" variant="outline">Grande</PButton>
          <PButton icon="plus">Con icono</PButton>
          <PButton icon="plus" icon-only aria-label="Añadir" />
          <PButton loading>Guardar</PButton>
          <PButton disabled>Desactivado</PButton>
          <PButton href="#catalogo" variant="outline">Enlace</PButton>
        </div>
      </div>
    </PCard>

    <PCard title="Formularios">
      <form class="grid gap-4 sm:grid-cols-2" novalidate @submit.prevent="submit">
        <PInput
          v-model="buscar"
          label="Buscar"
          icon="magnifying-glass"
          placeholder="Buscar..."
          type="search"
        />
        <PInput
          v-model="nombre"
          label="Nombre"
          help="Cómo te verán los demás"
          :error="errors.nombre"
        />
        <PSelect
          v-model="comunidad"
          label="Comunidad"
          placeholder="Selecciona una opción"
          :options="opciones"
          :error="errors.comunidad"
        />
        <PNumberInput v-model="puntos" label="Puntos" :min="0" :max="25" />
        <PRangeInput v-model="confianza" label="Confianza" />
        <PTextarea v-model="notas" label="Notas" placeholder="Escribe aquí" help="Opcional" />
        <div class="flex flex-col gap-1">
          <PCheckbox v-model="acepto" label="Acepto las normas" />
          <PCheckbox v-model="noAcepto" label="Recibir avisos" help="Un correo por Gran Premio" />
        </div>
        <fieldset class="flex flex-col">
          <legend class="text-body mb-1 text-xs font-bold tracking-wide uppercase">Sesión</legend>
          <PRadio v-model="modo" name="modo" value="carrera" label="Carrera" />
          <PRadio v-model="modo" name="modo" value="clasificacion" label="Clasificación" />
          <PRadio v-model="modo" name="modo" value="sprint" label="Sprint" disabled />
        </fieldset>
        <div class="flex flex-col gap-1">
          <PSwitch v-model="aviso" label="Notificaciones" />
          <PSwitch v-model="avisoOff" label="Modo compacto" />
        </div>
        <div class="sm:col-span-2"><PButton type="submit">Guardar cambios</PButton></div>
      </form>
    </PCard>

    <PCard title="Navegación y filtros">
      <div class="flex flex-col gap-5">
        <Breadcrumb :items="breadcrumb" />
        <PTabs v-model="tab" :tabs="tabs" label="Secciones de ejemplo">
          <template #resumen>Contenido del resumen.</template>
          <template #pronosticos>Contenido de pronósticos.</template>
        </PTabs>
        <div class="flex flex-wrap items-center gap-4">
          <SegmentedControl
            v-model="segment"
            label="Lectura del gráfico"
            :options="[
              { value: 'acumulado', label: 'Acumulado' },
              { value: 'ritmo', label: 'Ritmo' },
              { value: 'contigo', label: 'Contigo' },
            ]"
          />
          <Chip v-model="chipA">Solo amigos</Chip>
          <Chip v-model="chipB" icon="flag">Mi equipo</Chip>
        </div>
        <PStepper v-model="step" :steps="steps">
          <template #step-0>Paso de datos.</template>
          <template #step-1>Paso de pilotos.</template>
          <template #step-2>Paso de revisión.</template>
        </PStepper>
      </div>
    </PCard>

    <PCard title="Etiquetas y avisos">
      <div class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center gap-2">
          <PTag color="brand">Marca</PTag>
          <PTag color="ok" icon="check">Acertado</PTag>
          <PTag color="warn">Pendiente</PTag>
          <PTag color="err">Error</PTag>
          <PTag color="info">Info</PTag>
          <PTag color="gray">Gris</PTag>
          <PTag color="solid">Sólido</PTag>
          <PTag color="brand" :pill="false">Rectangular</PTag>
        </div>
        <PrognoAlert variant="brand" title="PrognoSports Beta"
          >Estás utilizando una versión de prueba.</PrognoAlert
        >
        <PrognoAlert variant="ok" title="Guardado">Tus pronósticos se han guardado.</PrognoAlert>
        <PrognoAlert variant="warn" title="Cierra pronto">Quedan menos de dos horas.</PrognoAlert>
        <PrognoAlert variant="err" title="No se ha podido guardar">Inténtalo de nuevo.</PrognoAlert>
        <PrognoAlert variant="info" title="Novedad" dismissible
          >Ya puedes comparar jugadores.</PrognoAlert
        >
      </div>
    </PCard>

    <PCard title="Datos">
      <div class="flex flex-col gap-5">
        <div class="flex flex-wrap items-center gap-3">
          <Avatar name="Lucía Pérez" :size="24" />
          <Avatar name="Marcos Ruiz" :size="32" />
          <Avatar name="Elena Gil" :size="40" />
          <Avatar name="Alberto Z" :size="56" you />
        </div>
        <div class="grid gap-2 sm:grid-cols-2">
          <DriverRow
            v-for="(d, i) in catalogDrivers"
            :key="d.code"
            v-bind="d"
            :selectable="i === 1"
            :selected="i === 1"
          />
        </div>
        <Countdown :target="closing" :now="frozenNow" />
        <PTable
          :columns="columns"
          :data="rows"
          caption="Clasificación de ejemplo"
          :is-mine="(r: Row) => !!r.me"
        />
        <PPagination v-model="page" :total="total" :per-page="perPage" />
        <div class="grid gap-4 sm:grid-cols-3">
          <PCard :padded="false"
            ><Kpi label="Puntos" value="198" delta="+12 pts" trend="up"
          /></PCard>
          <PCard :padded="false"
            ><Kpi label="Posición" value="2" delta="1 puesto" trend="down"
          /></PCard>
          <PCard :padded="false"><Kpi label="Aciertos" value="14" /></PCard>
        </div>
        <ProgressBar :value="65" label="Pronósticos completados" />
        <!-- eslint-disable-next-line vuejs-accessibility/form-control-has-label -->
        <Meter :value="40" label="Puntos sobre el máximo" />
      </div>
    </PCard>

    <PCard title="Capas">
      <div class="flex flex-wrap items-center gap-3">
        <PTooltip content="Se cierra una hora antes de la sesión">
          <PButton variant="outline" icon="circle-info" icon-only aria-label="Más información" />
        </PTooltip>
        <Menu :entries="menu" @select="lastAction = $event">
          <template #trigger>
            <PButton variant="outline" icon="chevron-down">Cuenta</PButton>
          </template>
        </Menu>
        <PButton variant="soft" @click="modal = true">Abrir modal</PButton>
        <PButton variant="danger" @click="confirmModal = true">Eliminar comunidad</PButton>
        <span class="text-muted text-sm" aria-live="polite">{{ lastAction }}</span>
      </div>
      <PrognoModal
        v-model:open="modal"
        title="Editar perfil"
        description="Cambia tu nombre público."
      >
        <PInput v-model="nombre" label="Nombre" />
      </PrognoModal>
      <PrognoModal
        v-model:open="confirmModal"
        destructive
        title="Eliminar comunidad"
        description="Esta acción no se puede deshacer."
        confirm-label="Eliminar"
      />
    </PCard>

    <PCard title="Estructura">
      <div class="flex flex-col gap-6">
        <PTimeline>
          <PTimelineItem
            title="Pronóstico enviado"
            time="Hoy, 10:00"
            icon="check"
            variant="primary"
          />
          <PTimelineItem
            title="Cierre de pronósticos"
            time="Sábado, 16:00"
            icon="lock"
            variant="warn"
          >
            Ya no se podrá cambiar nada.
          </PTimelineItem>
          <PTimelineItem title="Carrera" time="Domingo, 15:00" icon="flag-checkered" />
        </PTimeline>
        <PPage title="Cabecera de página" title-as="h2" :breadcrumb="breadcrumb">
          <template #actions>
            <PButton variant="outline" size="sm">Cancelar</PButton>
            <PButton size="sm">Guardar</PButton>
          </template>
          Contenido de la página.
        </PPage>
      </div>
    </PCard>
  </div>
</template>
