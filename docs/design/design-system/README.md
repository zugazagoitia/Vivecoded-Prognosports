PrognoSports is a Spanish-language web app where friends predict motorsport race results and compete in communities. This is how its interface looks and speaks. Build new UI with Tailwind utilities and the `P*` components in `src/components/lib`; the values below are the ones in `tailwind.config.mjs`.

## Voice and content

- Write every user-facing string in Spanish. Code identifiers stay in English.
- Address the user as **tú**, never usted: `Selecciona una opción`, `Pronostica resultados de carreras con tus amigos y compite por ser el mejor`, `Estás utilizando PrognoSports Beta`.
- Sentence case everywhere, including buttons and headings: `Guardar cambios`, `Iniciar sesión`, `Volver arriba`. Only proper nouns and section names take capitals: `Grandes Premios`, `Ranking`.
- Buttons are a verb in the infinitive or a short verb phrase: `Registrarse`, `Cancelar`, `Ordenar`, `Pronosticar`.
- Be plain and friendly, a little competitive, never salesy. Exclamation marks only on the landing call to action: `¿Preparado para comenzar? ¡Regístrate y pruébalo gratis!`. Open questions and exclamations with `¿` and `¡`.
- Domain words: `pronóstico`, `comunidad`, `Gran Premio`, `circuito`, `sesión`, `cierre de pronósticos`, `puntos`, `ranking`. It is not a betting product: never use `apuesta`.
- Errors say what happened without blame: `No se ha encontrado lo que buscabas`. Loading says `Cargando...`. Empty search fields say `Buscar...`.
- Booleans in tables read `Sí` and `No`. Result counts read `Mostrando de 11 a 20 de un total de 48 resultados`.
- The product name is one word with two capitals: **PrognoSports**. The beta is `PrognoSports Beta`.
- No emoji in copy. The only ones in the product are the moon and sun inside the theme switch.

## Color

- Purple is the brand. `brand-500` (#693ba7) is the logo purple: use it for focus rings, checked controls and the hover of links. `brand-accent-500` (#8e4aec) is the action purple: use it, through `primary`, for the one main button of a view and for primary tags.
- Tint with the same scale: `brand-100` behind soft buttons and the active step, `brand-50` for row hover, `brand-600` for links and text on those tints. In dark mode the tint is `brand-900` at 30% with `brand-300` text.
- Neutrals are Tailwind's default `gray`. Light mode: `page` (#f5f5f5) behind `surface` (white) cards, `text-heading` gray-900, `text-body` gray-800, `text-muted` gray-500, `border` gray-200. Dark mode: `page` gray-800 behind `surface` gray-900 cards, inputs on gray-700, text gray-100 / gray-300 / gray-400, `border` gray-700.
- Status colours are `success` (green), `warning` (yellow), `error` (red), `info` (blue). Solid fills use the 500 step (`info` buttons use 600), tints use 100 with 600 text, dark-mode tags use the 400 fill with 900 text. Always pair a status colour with a word or an icon, as `PrognoAlert` does.
- `tertiary` green is the "teal" button; `pink` is an extra tag and button colour. `secondary`, `tertiary-accent`, `contrast-primary` (gold), `contrast-secondary` (cyan), `gray-dark` and `gray-purpleGray` are defined but the UI barely uses them: reach for them only for charts, team colours or highlights, never for controls.
- `logo-red` and `logo-maroon` belong to the mark. Do not use them in the interface; red in the UI is `error-500`.
- Dark mode is a `dark` class on `<html>`, toggled by the theme switch and stored in `localStorage`. Write every colour as a light/dark pair (`bg-white dark:bg-gray-900`).
- Known contrast gaps kept from the source, each noted on its token: white or near-white text on the `success-500`, `warning-500`, `tertiary-500`, `error-500`, `info-500` and `pink-500` fills; alert text on the 100 tints; `brand-500` focus ring on dark inputs. For new solid status fills prefer the 600 or 700 step under white text.

## Typography

- One family: **Inter** (variable, loaded from Google Fonts), falling back to `system-ui`. No serif, no mono.
- Headings are weight 600 in `text-heading`, through `PTitle`: `title` 36px for the page (24px below `md`), `subtitle` 24px for sections, `header` 20px for blocks and modal titles. The landing hero alone goes to 48px.
- Body is `body` 16/24. Use `body-sm` 14/20 in tables, tags, tooltips and navigation; `caption` 12/16 for helper text.
- Emphasis by weight, not size: 600 for buttons, card headers and the wordmark; 700 for field labels and alert text; 500 for nav links and tags.
- Uppercase only in table headers (`table-head`: 12px, 600, `tracking-wide`). Field labels also take `tracking-wide`; nothing else is tracked.
- Long-form text (rules, FAQ, terms) goes in `PProse`: Tailwind Typography with weight-600 headings and `brand-600` links.

## Layout and spacing

- Spacing is Tailwind's 4px scale. The steps the UI lives on: `space-2` inside controls, `space-3` for cells and compact card padding, `space-4` for gutters and gaps between blocks, `space-5` for card padding from `sm` up.
- Every app view is a `PPage`: breadcrumb, title row with actions on the right, then content in one `PCard` or a `plain` layout of several. The page sits under a 56px `Navbar` and above the footer.
- Widths come from `PContainer`: `container-xl` (1280px) by default, `container-2xl` on the landing, `container-sm` for sign-in forms.
- Mobile first. Breakpoints are Tailwind's: titles and card padding step up at `sm`/`md`, the navbar expands at `md`. Nothing may scroll sideways except tables, which scroll inside their wrapper.

## Shape, borders and elevation

- Three radii: `rounded` 4px for small chips (tags, alerts, checkboxes), `rounded-md` 6px for controls (buttons, inputs, nav links), `rounded-lg` 8px for containers (cards, modal, tables, menus). `rounded-full` for pills, switches and avatars.
- Cards separate from the page by `shadow-card` plus a 1px ring at 5% black (10% white in dark), not by a border. Inside a card, use 1px `border` rules between header, body and footer.
- Controls carry `shadow-sm`. Tooltips and menus float on `shadow-lg`. No gradients, no coloured glows.
- Inputs have a 1px `border-input` that turns `brand-500` with a 1px ring on focus, and `error-500` when invalid.

## Motion

- Small and quick. Buttons shrink to 95% while pressed. Tabs and panels move 4-8px and fade over 200ms ease-out; tooltips fade in 200ms and out in 150ms; collapses fade in 200ms.
- Colour changes on hover use `transition-colors`. The theme change animates the page ground.
- Respect `prefers-reduced-motion`: the tab transitions already turn off under it; new motion must too.

## Iconography

- Icons are **Font Awesome 6.2 Free**, loaded as a web font and written as class strings: `fas fa-trophy`, `fa fa-plus`, `fab fa-telegram`. Pass the class to a component's `icon` prop or to `PIcon`. Common ones: `fa-plus` create, `fa-cogs` settings, `fa-eye` view, `fa-pencil` edit, `fa-trash` delete, `fa-search`, `fa-chevron-left` back, `fa-trophy` ranking, `fa-lock` closed, `fa-clock` and `fa-calendar` for dates.
- Icons inherit the text colour and size. In buttons they sit before the label.
- The landing feature tiles use **Material Icons** ligatures (`people` and the like) at 72px in `brand-500`. Keep Material Icons to that page.
- `PrognoAlert`, the modal close button and `PPagination` draw their own inline outline SVGs (1.5px stroke, 24px box); reuse those paths for the same meanings.
- The previews in this system cannot load the Font Awesome font, so chevrons, the search glass, the house, the plus and the check are drawn as simple stand-in strokes there. In the app use the Font Awesome glyphs.

## Logo

- Use the files in the Logos group as they are. The mark is a P in `logo-purple` with red and maroon trailing layers and a red leaf.
- There is no wordmark artwork: set **PrognoSports** in Inter 600 beside the mark, as the navbar does (28px mark, 16px text).
- Colour mark on white, `page` or light tints; the white-P version on `brand-500`; the black-and-white versions for one-colour use and dark grounds.

## Data, charts and predictions

Added with the frontend redesign (canvas «PrognoSports · Rediseño»). The pieces below are proposals not yet in code; their cards are marked so.

- **Focus + context.** Every chart about players follows one rule: you in `series-you`, up to five highlighted players in `series-2` … `series-6` in that fixed order, everyone else in `series-rest`, thin and behind. The colour follows the player, never the rank, so a filter never repaints anyone. People choose who is highlighted with `PlayerChip`s under the chart.
- **Label, don't decode.** Highlighted lines end in a direct label (name and value), at least 13px apart. A legend is still present, and every chart has a «Ver como tabla» view with the same figures.
- **Modes, not more charts.** A chart offers 2 to 4 readings of the same data (`Con el líder`, `Contigo`, `Acumulado`, `Ritmo`) in a segmented control at the top right. Never two y-axes.
- **Pinnable GP.** The x-axis is a row of buttons (`ChartAxis`): clicking a GP pins a dashed guide and a fixed panel with the values at that GP. Hover previews; Tab and Enter work.
- **Magnitude** uses the one-hue `seq-1` … `seq-7` scale with a legend ramp («menos» → «más»). No rainbow.
- **Hits** are solid cells (`HitCell`): `hit-exact` 5 pts, `hit-near` 3, `hit-far` 1. A miss has no colour, only muted text, so it is obvious who scored. The number or driver code is always in the cell.
- **Form and movement.** Tables show the last five GP places (`FormChips`: brand fill = won, tint = podium) and the move since the last GP as `▲2` / `▼1` in `success-700` / `error-700` text, never colour alone.
- **Session states.** A session is *open* (others' predictions hidden), *closed* (all predictions and the consensus visible) or *scored* (hit cells and points). Each state has its own alert colour and icon.
- **Saving.** Admin forms show a sticky `SaveBar` only while there are unsaved changes; readiness is a `ValidationList` with an icon and a word per line.

## Components

The components are Vue 3 single-file components, used in the app as `<PButton>`, `<PCard>` and so on. Their cards here are static renditions with the same Tailwind classes, for reference; there is no script bundle to load. Each card's guidelines list the props and what the consumer provides.

Leftovers to avoid copying into new work: Tailwind `blue` on the active tab and select focus, `indigo-600` on the current page number, stock `red/green/yellow/blue` in tooltip variants, and the `secondary` colour of checkboxes, radios and switches (it is `blue`, not the `secondary` palette). Use `brand` and the semantic scales instead. Bulma and Oruga are being phased out: do not add their classes.

## Not synced

- The `series-*`, `seq-*`, `hit-*` and `medal-*` colour tokens and the cards in the Data and Prediction groups come from the redesign canvas, not from `tailwind.config.mjs`. A re-sync from code must keep them until the code adopts them.

- Semantic colour tokens (`page`, `surface`, `text-*`, `border*`, `primary`, `link`, `focus-ring`) are additions: the code has no such names, they record the light/dark class pairs the components repeat. `logo-*` values come from `public/logo_progno.svg`. Spacing, radius, shadow and container tokens are the Tailwind defaults the components use, under Tailwind's names.
- Components are documented, not built: previews are hand-rendered HTML with a fixed copy of the palette, so editing a token on this page does not restyle them.
- Not given a card: `CalendarDateTimePicker`, `ColorPicker`, `PEditableImage`, `UploadFileModal`, `PSearchSortBar`, `PCollapse`, `PContainer`, `PMedia`, `PProse`, `PDivider`, `PIcon`, `ToTop`, `PSimpleTable`, `ColorBadge`, the navbar's `SwitchTheme`, `AvatarComponent` and `CommunitiesDropdown`, the landing footer, and the feature components under `src/components` (circuits, communities, gps, user, admin).
- Favicons and PWA icons in `public/` were left out. Inter, Font Awesome and Material Icons are loaded from their CDNs, so there are no font files.
