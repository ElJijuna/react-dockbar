# react-dockbar

A macOS-Dock-style, animated app bar for React 18 and 19: hover magnification, drill-down
navigation with an auto-inserted Back item, and a glass/translucent theme configurable for
light and dark.

## Installation

```bash
npm install react-dockbar
```

```jsx
import { DockBar } from 'react-dockbar';
import 'react-dockbar/style.css';

function AppMenuBar() {
  return (
    <DockBar
      items={[
        { id: 'finder', label: 'Finder', icon: <FinderIcon />, onSelect: () => openFinder() },
        {
          id: 'settings',
          label: 'Settings',
          icon: <SettingsIcon />,
          children: [
            { id: 'wifi', label: 'Wi-Fi', icon: <WifiIcon />, onSelect: () => openWifi() },
            { id: 'display', label: 'Display', icon: <DisplayIcon />, onSelect: () => openDisplay() },
          ],
        },
      ]}
      colorScheme="auto"
      variant="glass"
    />
  );
}
```

## Behavior

- **Flat items**: leaf items call `onSelect({ item, path, nativeEvent })` when activated.
- **Nested items**: clicking an item with `children` shrinks the current level toward the
  center, then expands into that item's children. A circular Back button appears in its own
  bubble to the left of the dock (above it when vertical); clicking it (or pressing `Escape`)
  reverses the animation back up one level. Spacing is tunable via `--dockbar-back-gap`.
- **Active item**: pass `activeId` (controlled, e.g. from your router) or `defaultActiveId`
  (uncontrolled; activating a leaf makes it active). The active item gets a dot indicator and
  `aria-current`; parents containing a nested active item get a dimmer dot.
- **Hover magnification**: items scale up under the pointer, tapering off for nearby
  neighbors, matching macOS Dock behavior. Defaults depend on the variant (pronounced for
  `glass`/`solid`, subtle for `pill`); pass `magnification={{ scale, distance }}` to override
  any part of it, or `false` to disable.
- **Separators**: add `{ type: 'separator', id: 'sep-1' }` entries to split items into groups.
- **Toggle items**: give a leaf item `pressed: boolean` to make it a toggle button
  (`aria-pressed`) — e.g. panels that can be open at the same time. It is controlled: flip it in
  `onSelect`. Toggling never changes the active item, so both can be shown together.
- **Theming**: `colorScheme` (`'light' | 'dark' | 'auto'`) and `variant` (`'glass' | 'solid' | 'pill'`)
  props switch themes (`pill` is a compact rounded toolbar with a filled active item); deeper customization is available through CSS custom properties
  (`--dockbar-bg`, `--dockbar-blur`, `--dockbar-accent`, `--dockbar-item-size`, ...) documented
  in `src/theme/tokens.css`.
- **Accessibility**: renders as a `role="toolbar"` of native `<button>`/`<a>` elements, moves
  focus to/from the Back button on navigation, announces level changes via a live region, and
  respects `prefers-reduced-motion` (or force it via the `reducedMotion` prop). Keyboard follows
  the WAI-ARIA toolbar pattern: a single Tab stop, arrow keys (↑/↓ when vertical) to move,
  Home/End, and `Escape` to go back.

## Translating screen-reader texts

The dock name and the Back label are props; the dynamic texts are builder functions, so each
language controls its own grammar and plurals. Any builder you omit falls back to English.

```tsx
<DockBar
  items={items}
  ariaLabel="Barra de herramientas"
  backItem={{ label: 'Atrás' }}
  labels={{
    parentItem: (label, count) => `${label}, abre ${count} ${count === 1 ? 'opción' : 'opciones'}`,
    backTo: (label) => `Volver a ${label}`,
    enteredLevel: (label, depth) => `${label}, nivel ${depth + 1}`,
    returnedTo: (label) => (label ? `De vuelta en ${label}` : 'De vuelta en el menú principal'),
  }}
/>
```

## Development

```bash
npm install
npm run dev          # Storybook
npm test             # Jest + Testing Library
npm run lint          # eslint + biome
npm run build         # library build (ESM + CJS + types + style.css)
```

Linting, formatting, and TypeScript/Jest configuration are provided by
[`super-configs`](https://github.com/ElJijuna/super-configs).

## License

MIT
