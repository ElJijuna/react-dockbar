# react-dockbar

[![npm version](https://img.shields.io/npm/v/react-dockbar?logo=npm&color=cb3837)](https://www.npmjs.com/package/react-dockbar)
[![npm downloads](https://img.shields.io/npm/dm/react-dockbar?logo=npm&color=cb3837)](https://www.npmjs.com/package/react-dockbar)
[![bundle size](https://img.shields.io/bundlephobia/minzip/react-dockbar?label=min%2Bgzip)](https://bundlephobia.com/package/react-dockbar)
[![CI](https://github.com/ElJijuna/react-dockbar/actions/workflows/ci.yml/badge.svg)](https://github.com/ElJijuna/react-dockbar/actions/workflows/ci.yml)
[![Release](https://github.com/ElJijuna/react-dockbar/actions/workflows/release.yml/badge.svg)](https://github.com/ElJijuna/react-dockbar/actions/workflows/release.yml)
[![Storybook](https://img.shields.io/badge/Storybook-live%20demo-ff4785?logo=storybook&logoColor=white)](https://eljijuna.github.io/react-dockbar/)
[![license](https://img.shields.io/npm/l/react-dockbar)](./LICENSE)
[![semantic-release](https://img.shields.io/badge/semantic--release-automated-e10079?logo=semantic-release)](https://github.com/semantic-release/semantic-release)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-fe5196?logo=conventionalcommits&logoColor=white)](https://www.conventionalcommits.org)

[![React](https://img.shields.io/badge/React-18%20%7C%2019-61dafb?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)](https://vite.dev)
[![Jest](https://img.shields.io/badge/Jest-30-c21325?logo=jest&logoColor=white)](https://jestjs.io)
[![Testing Library](https://img.shields.io/badge/Testing%20Library-React-e33332?logo=testinglibrary&logoColor=white)](https://testing-library.com/docs/react-testing-library/intro/)
[![Storybook](https://img.shields.io/badge/Storybook-10-ff4785?logo=storybook&logoColor=white)](https://storybook.js.org)
[![ESLint](https://img.shields.io/badge/ESLint-10-4b32c3?logo=eslint&logoColor=white)](https://eslint.org)
[![Biome](https://img.shields.io/badge/Biome-2-60a5fa?logo=biome&logoColor=white)](https://biomejs.dev)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A522.13-5fa04e?logo=nodedotjs&logoColor=white)](https://nodejs.org)

A macOS-Dock-style, animated app bar for React 18 and 19: hover magnification, drill-down
navigation with an auto-inserted Back item, and a glass/translucent theme configurable for
light and dark.

![react-dockbar pill toolbar with a tooltip over the hovered item](https://raw.githubusercontent.com/ElJijuna/react-dockbar/main/docs/images/pill-toolbar-light.png)

**[Live demo (Storybook)](https://eljijuna.github.io/react-dockbar/)**

## Screenshots

| | |
| --- | --- |
| **Open windows**: hover an app to see its windows as thumbnails.<br>![Previews panel with three window thumbnails over the Chat item](https://raw.githubusercontent.com/ElJijuna/react-dockbar/main/docs/images/window-previews.png) | **Drill-down**: nested levels with an auto-inserted Back button.<br>![Submenu level with the Back button next to the dock](https://raw.githubusercontent.com/ElJijuna/react-dockbar/main/docs/images/drill-down.png) |
| **Dark mode**: `colorScheme="dark"` (or `auto`).<br>![Pill toolbar in dark mode](https://raw.githubusercontent.com/ElJijuna/react-dockbar/main/docs/images/pill-toolbar-dark.png) | **Variants**: `pill`, `glass` and `solid`, light and dark.<br>![The three variants in light and dark](https://raw.githubusercontent.com/ElJijuna/react-dockbar/main/docs/images/theme-matrix.png) |

**Positions**: pin it to any edge or corner with `position`, or keep it `inline`.

![The dock in every position of the viewport](https://raw.githubusercontent.com/ElJijuna/react-dockbar/main/docs/images/positions.png)

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
      variant="pill"
      position="bottom-center"
    />
  );
}
```

## Behavior

- **Position**: by default the dock is pinned to the bottom center of the viewport
  (`position: fixed`, respecting safe-area insets). `position` accepts `'bottom-center'`,
  `'bottom-left'`, `'bottom-right'`, `'top-center'`, `'top-left'`, `'top-right'`,
  `'left-center'` and `'right-center'` (pair the side ones with `orientation="vertical"`), or
  `'inline'` to render it in the document flow inside your own layout. Tooltips and
  magnification open away from the edge. Tune the edge distance with `--dockbar-offset`
  (default `16px`) and stacking with `--dockbar-z-index` (default `1000`).
- **Flat items**: leaf items call `onSelect({ item, path, nativeEvent })` when activated.
- **Nested items**: clicking an item with `children` shrinks the current level toward the
  center, then expands into that item's children. A circular Back button appears in its own
  bubble to the left of the dock (above it when vertical); clicking it (or pressing `Escape`)
  reverses the animation back up one level. Spacing is tunable via `--dockbar-back-gap`.
- **Active item**: pass `activeId` (controlled, e.g. from your router) or `defaultActiveId`
  (uncontrolled; activating a leaf makes it active). The active item gets a dot indicator and
  `aria-current`; parents containing a nested active item get a dimmer dot. Add
  `openActiveLevel` to start inside the submenu that holds the active item (mount only — later
  `activeId` changes never move the user away from the level they are browsing).
- **Hover magnification**: items scale up under the pointer, tapering off for nearby
  neighbors, matching macOS Dock behavior. Defaults depend on the variant (pronounced for
  `glass`/`solid`, subtle for `pill`); pass `magnification={{ scale, distance }}` to override
  any part of it, or `false` to disable.
- **Separators**: add `{ type: 'separator', id: 'sep-1' }` entries to split items into groups.
- **Toggle items**: give a leaf item `pressed: boolean` to make it a toggle button
  (`aria-pressed`) — e.g. panels that can be open at the same time. It is controlled: flip it in
  `onSelect`. Toggling never changes the active item, so both can be shown together.
- **Open windows (previews)**: give a leaf item `previews` (`{ id, title, thumbnail, active?,
  onSelect?, onClose? }[]`) to show its open windows. The item gets up to three dots, and
  hovering it opens a panel of thumbnails over it (after `previewDelay.open`, 400ms; it stays
  `previewDelay.close`, 200ms, after the pointer leaves so the pointer can reach it). Clicking an
  item with two or more windows pins the panel instead of calling `onSelect`; with one window
  the click selects as usual. Selecting a thumbnail calls its `onSelect`, closes the panel and
  makes the item active; `onClose` adds a close button (and `Delete`). The thumbnails are yours
  to render (`<img>`, `<canvas>`, `<video>`…) and are only mounted while the panel is open. The
  panel opens away from the screen edge, in the top layer (Popover API), and can be controlled
  with `openPreviewsId`/`onPreviewsOpenChange`. Keyboard: the arrow pointing at the panel (↑ for a
  bottom dock) opens it and focuses the front window, arrows move between windows, `Escape`
  closes it and returns focus to the item. Style it with `--dockbar-preview-width`,
  `--dockbar-preview-aspect-ratio`, `--dockbar-preview-radius` and `--dockbar-preview-bg`.
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
    previewsItem: (label, count) =>
      `${label}, ${count} ${count === 1 ? 'ventana abierta' : 'ventanas abiertas'}`,
    previewsPanel: (label) => `Ventanas de ${label}`,
    closePreview: (title) => `Cerrar ${title}`,
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
