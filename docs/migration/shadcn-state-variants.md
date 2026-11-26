# shadcn state variants on Radix primitives

The shadcn components in `components/ui/` come from the `radix-nova` registry
style (`components.json`). They render Radix primitives from `radix-ui`, but
their class names use short state variants that look like Base UI attributes:
`data-open:`, `data-closed:`, `data-checked:`, `data-unchecked:`,
`data-active:`, `data-selected:`, `data-disabled:`, `data-horizontal:` and
`data-vertical:` (including `group-`, `peer-` and `has-` forms such as
`group-data-vertical/tabs:`).

## The mismatch

Radix does not set `data-open`, `data-checked`, `data-horizontal` and similar
attributes. It sets `data-state="open|closed|checked|unchecked|active"` and
`data-orientation="horizontal|vertical"`. Tailwind's built-in `data-*` variant
only checks whether an attribute exists, so `data-horizontal:h-px` compiled to
`[data-horizontal]` and never matched a Radix separator.

shadcn ships the missing mapping in the `shadcn` package as
`shadcn/tailwind.css`. That stylesheet defines a `@custom-variant` for each
name, for example:

```css
@custom-variant data-open {
  &:where([data-state="open"]),
  &:where([data-open]:not([data-open="false"])) {
    @slot;
  }
}

@custom-variant data-horizontal {
  &:where([data-orientation="horizontal"]) {
    @slot;
  }
}
```

`app/globals.css` never imported it, so every Radix-backed state variant
silently did nothing or matched the wrong elements:

- `Separator`: horizontal separators were 0px tall (invisible). This affected
  member cards, event cards, section dividers on Members/Events, and the
  Newsletter send panel.
- `ScrollBar`: no width, height or orientation layout for either orientation.
- `Tabs`: the list rendered beside the content, and the active tab was never
  highlighted.
- `Dialog`, `AlertDialog`, `Popover`, `Tooltip`, `DropdownMenu`, `Select`:
  open and close animations never ran. The dropdown sub-trigger had no
  open-state background.
- `Accordion`: open and close height animations never ran.
- `Checkbox`: checked boxes had no primary background or border.
- `Field`: checked choice cards and horizontal field descriptions were
  unstyled.
- `ToggleGroup`: vertical groups did not stack, and joined borders and radii
  for spacing `0` did not apply.
- `Command` (cmdk), which uses the opposite failure mode: cmdk renders
  `data-selected="false"` and `data-disabled="false"` on every item. The
  presence-only built-in variant matched those too, so every result in
  `SearchableSelect` (University picker, Link Analytics filters) looked
  highlighted. shadcn's `data-selected` variant only matches `"true"`.

## The fix

`app/globals.css` imports the stylesheet directly after `tw-animate-css`:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
```

This fixes the variant definitions once, for every current and future
registry component. We did not rewrite each component to arbitrary variants
(`data-[state=open]:`, `data-[orientation=horizontal]:`). That rewrite would
touch around 15 files, drift from the registry source, and break again on the
next `shadcn add`.

The import also brings shadcn's `accordion-down`/`accordion-up` keyframes,
which read `--radix-accordion-content-height`, plus the opt-in `no-scrollbar`,
`scroll-fade*` and `shimmer*` utilities. Unused utilities produce no CSS.

`shadcn` is already a dev dependency, like `tailwindcss` and
`@tailwindcss/postcss`, which the CSS build also needs.

## Compatibility

- Explicit arbitrary variants such as `data-[state=active]:` and
  `data-[orientation=vertical]:` keep working. `switch.tsx` and `sheet.tsx`
  already use them. So does the `tabs.tsx` change on `feature/yearbook`, so
  that branch merges cleanly with this fix. Registry-style short variants are
  preferred for new code because they keep `components/ui/` close to upstream.
- Base UI components (`combobox.tsx`) and `@shadcn/react/questionnaire` set
  `data-open`, `data-checked` etc. directly. The custom variants still match
  them through their second selector.
- The custom variants treat `data-*="false"` as off. A wrapper may therefore
  pass booleans straight through (`data-active={isActive}`). The sidebar's
  `isActive || undefined` remains correct.
- Feature code outside `components/ui/` does not use these variant names, so
  no page-level overrides were needed or removed.

## Verification

The compiled CSS now contains, for example,
`.data-horizontal\:h-px:where([data-orientation="horizontal"])` and
`.data-open\:animate-in:where([data-state="open"]), …:where([data-open]:not([data-open="false"]))`.

Checked in the local dev preview with the documented `DEV_AUTH_BYPASS`, before
and after the import:

| Check | Before | After |
| --- | --- | --- |
| `/members` separators (6) | `height: 0px` | `height: 1px` |
| University picker, unselected results | highlighted (`bg-muted`) | transparent |
| Popover / dropdown menu open animation | none | `enter` |
| Sidebar active item | highlighted | highlighted (unchanged) |

Probe elements carrying the component classes and Radix attributes confirmed
the rest against the live stylesheet:

- vertical scrollbar 10px wide, horizontal scrollbar 10px tall and column
  layout;
- checked checkbox `--primary` background;
- vertical toggle group and tabs column layout, tabs list 32px tall;
- accordion `accordion-down`/`accordion-up`;
- Radix `data-disabled=""` at 50% opacity, cmdk `data-disabled="false"` at
  full opacity.

Keep the import. Removing it reintroduces all of the above without any build
or type error.
