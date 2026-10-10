# Navbar

The app bar: mark and wordmark, section links, then sign-in actions or the user controls.

Source: `src/components/navbar/Navbar.vue` (Vue 3 SFC, hand-rendered here as static Tailwind markup).

## Structure
- Left: `logo_navbar.png` at 28px beside the wordmark `PrognoSports` (16px, weight 600).
- Middle, when signed in: `Grandes Premios`, `Circuitos`, `Ranking`, and `Admin` for admins: 14px, weight 500, `rounded-md`, hover on `surface-muted`.
- Right: `Registrarse` (solid primary) and `Iniciar sesión` (outline primary) when signed out; the community dropdown, the theme switch and the avatar menu when signed in.

## Notes
- 56px tall, `surface` ground, bottom `border` and `shadow-sm`. Below `md` the links collapse behind a menu button.
- The preview mixes the signed-in links with the signed-out buttons to show both; the app never shows them together.
