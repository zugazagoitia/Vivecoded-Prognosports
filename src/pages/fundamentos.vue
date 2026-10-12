<script setup lang="ts">
// Sample page for F2 (typography, icons, logo, grids). Also the visual-regression target.
import AppLogo from '@/components/ui/AppLogo.vue'
import PIcon from '@/components/ui/PIcon.vue'
import { iconFor, MATERIAL_TO_FA } from '@/components/ui/icons'

definePage({ meta: { layout: 'empty' } })

const materialNames = Object.keys(MATERIAL_TO_FA)
</script>

<template>
  <div class="pg-main col g24">
    <AppLogo />
    <h1 class="t-title">Título de página 36/40</h1>
    <h2 class="t-subtitle">Subtítulo 24/32</h2>
    <h3 class="t-header">Cabecera 20/28</h3>
    <p class="t-body">Cuerpo 16/24 con cifras <span class="tn">1.234,56 · 0123456789</span></p>
    <p class="t-body-sm">Cuerpo pequeño 14/20 (tablas, etiquetas, navegación)</p>
    <p class="t-caption">Pie 12/16</p>
    <p class="t-up">Cabecera de tabla</p>

    <div class="prose">
      <h2>Texto largo</h2>
      <p>Reglas, preguntas frecuentes y textos legales usan la clase <code>prose</code>.</p>
      <p><a href="/fundamentos">Un enlace</a> en color de marca.</p>
    </div>

    <ul class="icon-list row g16">
      <li v-for="m in materialNames" :key="m" class="row g8 t-body-sm">
        <PIcon :name="iconFor(m)" :size="20" />
        <span>{{ iconFor(m) }}</span>
      </li>
    </ul>

    <div class="grid4">
      <div>Rejilla 4</div>
      <div>Rejilla 4</div>
      <div>Rejilla 4</div>
      <div>Rejilla 4</div>
    </div>
    <div class="split">
      <div>Split: contenido</div>
      <div>Lateral</div>
    </div>
    <div class="side-l">
      <div>Side-l: lateral 240</div>
      <div>Contenido</div>
    </div>
    <div class="tw">
      <table>
        <tbody>
          <tr>
            <td v-for="n in 20" :key="n" class="tn">Celda ancha {{ n }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.icon-list {
  flex-wrap: wrap;
  padding: 0;
  list-style: none;
}
td {
  white-space: nowrap;
}
</style>
