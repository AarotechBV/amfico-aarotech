# Amfitech Design

Shared Amfico design tokens consumed by every Angular app in this workspace.

The file `src/styles.scss` defines CSS custom properties (colors, type,
spacing, radii, shadows, motion) plus a small base layer of element
styles. Apps include it via their `project.json` `styles` array:

```json
"styles": [
  "libs/amfitech-design/src/styles.scss",
  "apps/<app>/src/styles.scss"
]
```

The app's own `styles.scss` is then free to add app-specific overrides
(usually nothing — most styling lives in component scopes).

Updating the design system means editing this file once; both apps pick
up the change on the next build.
