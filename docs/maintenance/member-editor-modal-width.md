# Member Editor Modal Width

## Issue

The shadcn `DialogContent` primitive includes a default `sm:max-w-sm` class. Passing only `max-w-4xl` to the member editor dialog does not override that responsive `sm:` rule, so the dialog remains narrow on desktop viewports.

## Change

- The member editor dialog now uses `max-w-[calc(100vw-2rem)] sm:max-w-5xl`.
- This preserves mobile viewport padding while explicitly overriding the shadcn desktop default.
