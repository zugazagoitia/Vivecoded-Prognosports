# PrognoModal

Dialog with a title bar, body and footer, wrapped in a form whose submit is the primary action.

Source: `src/components/lib/PrognoModal.vue` (Vue 3 SFC, hand-rendered here as static Tailwind markup).

## What the consumer provides
The `title` (prop or slot), the body in the `content` slot, and a submit handler. The default footer is `Guardar cambios` (solid primary, submits) and `Cancelar` (soft info, closes); rename them with the `saveText` and `cancelText` slots or replace the whole `footer` slot.

## Notes
- Overlay is `gray-800` at 80%. The dialog is half the viewport wide from `md` up, at most 90vh tall, `rounded-lg`, `surface` ground.
- Teleported; closes from the X button, the overlay and the cancel button. `UploadFileModal` builds on it.
