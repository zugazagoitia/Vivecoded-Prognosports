<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { I18nT, useI18n } from 'vue-i18n'
import { focusRing } from '@/components/ui/styles'
import PIcon from '@/components/ui/PIcon.vue'
import {
  MAP_DEFAULT_ZOOM,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  formatCoords,
  mapTiles,
  osmLink,
} from '@/lib/circuitDetail'

/**
 * Lightweight map of the circuit: a CARTO raster basemap (light/dark with the theme) made of a few
 * `<img>` tiles, a marker and zoom buttons. No map library (MapLibre would need `worker-src blob:`
 * and ~800 kB; see docs/security.md). CSP: only `img-src` for basemaps.cartocdn.com.
 */
const props = defineProps<{
  latitude: number
  longitude: number
  circuit: string
  locality: string
}>()
const { t } = useI18n()

const zoom = ref(MAP_DEFAULT_ZOOM)
const dark = ref(false)
const retina = ref(false)
let observer: MutationObserver | undefined

function readTheme() {
  dark.value = document.documentElement.dataset.theme === 'dark'
}
onMounted(() => {
  readTheme()
  retina.value = (globalThis.devicePixelRatio ?? 1) > 1
  observer = new MutationObserver(readTheme)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
})
onBeforeUnmount(() => observer?.disconnect())

const tiles = computed(() =>
  mapTiles(props.latitude, props.longitude, zoom.value, dark.value, retina.value),
)
const label = computed(() =>
  t('circuits.detail.map.label', { circuit: props.circuit, locality: props.locality }),
)
const coords = computed(() => formatCoords(props.latitude, props.longitude))

const btn = [
  'bg-surface text-heading border-border-input hover:bg-surface-muted inline-flex size-11 cursor-pointer items-center justify-center rounded-md border shadow-sm disabled:cursor-not-allowed disabled:opacity-50 md:size-9',
  focusRing,
]
</script>

<template>
  <div class="flex flex-col gap-3">
    <div
      class="bg-surface-muted ring-border relative h-60 overflow-hidden rounded-lg ring-1 sm:h-[340px]"
    >
      <div role="img" :aria-label="label" class="absolute inset-0 overflow-hidden">
        <img
          v-for="tile in tiles"
          :key="tile.key"
          :src="tile.url"
          alt=""
          width="256"
          height="256"
          decoding="async"
          draggable="false"
          class="absolute block max-w-none select-none"
          :style="{ left: `calc(50% + ${tile.left}px)`, top: `calc(50% + ${tile.top}px)` }"
        />
        <span
          class="bg-primary ring-tint absolute top-1/2 left-1/2 -mt-2.5 -ml-2.5 size-5 rounded-full ring-4"
        />
      </div>
      <div
        class="absolute top-3 left-3 flex flex-col gap-0.5"
        role="group"
        :aria-label="t('circuits.detail.map.controls')"
      >
        <button
          type="button"
          :class="btn"
          :aria-label="t('circuits.detail.map.zoomIn')"
          :disabled="zoom >= MAP_MAX_ZOOM"
          @click="zoom = Math.min(MAP_MAX_ZOOM, zoom + 1)"
        >
          <PIcon name="plus" :size="16" />
        </button>
        <button
          type="button"
          :class="btn"
          :aria-label="t('circuits.detail.map.zoomOut')"
          :disabled="zoom <= MAP_MIN_ZOOM"
          @click="zoom = Math.max(MAP_MIN_ZOOM, zoom - 1)"
        >
          <PIcon name="minus" :size="16" />
        </button>
      </div>
      <I18nT
        keypath="circuits.detail.map.attribution"
        tag="p"
        scope="global"
        class="bg-surface text-muted absolute right-0 bottom-0 rounded-tl-md px-1.5 py-0.5 text-[11px] opacity-95"
      >
        <template #osm>
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            class="text-link underline"
            >{{ t('circuits.detail.map.osm') }}</a
          >
        </template>
        <template #carto>
          <a
            href="https://carto.com/attributions"
            target="_blank"
            rel="noopener noreferrer"
            class="text-link underline"
            >{{ t('circuits.detail.map.carto') }}</a
          >
        </template>
      </I18nT>
    </div>
    <p class="text-muted flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      <span>{{ t('circuits.detail.map.coords', { coords }) }}</span>
      <a
        :href="osmLink(latitude, longitude)"
        target="_blank"
        rel="noopener noreferrer"
        :class="['text-link inline-flex min-h-11 items-center underline md:min-h-6', focusRing]"
        >{{ t('circuits.detail.map.external') }}</a
      >
    </p>
  </div>
</template>
