# Step 5: Combobox and date picker compositions

The dashboard now uses shadcn compositions for searchable university selection and date entry.

## Decisions

- `UniversityAutocomplete` uses the shadcn `Combobox` instead of maintaining custom portal positioning, click-outside listeners, and keyboard state.
- Date-only values remain `YYYY-MM-DD` strings and month values remain `YYYY-MM` strings in form state.
- Date-time values remain local `YYYY-MM-DDTHH:mm` strings until the existing mutation boundary converts them to UTC. This prevents the picker from shifting the displayed calendar date.
- Coffee Chat deadlines are date-only controls. Their selected `YYYY-MM-DD` value is stored as local midnight and converted to UTC only at the mutation boundary.
- `components/date-picker.tsx` owns the shared `DatePicker`, `MonthPicker`, and `DateTimePicker` compositions built from shadcn `Calendar`, `Popover`, `Button`, and `Input` primitives.
- Hidden file inputs remain native because they provide browser file selection and do not duplicate a shadcn interaction primitive.

## Coverage

The shared pickers are used by external events, Coffee Chat round administration, link deployment metadata, and lecture scheduling.

Date value conversion behavior is covered by `tests/date-picker-values.test.ts`.
