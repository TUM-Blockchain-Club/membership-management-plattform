# The Tree of Life experiment

`/tree-of-life` is an authenticated, experimental member page in the persistent dashboard shell. It is available under Experimental in the sidebar.

The prototype displays five simulated annual board cohorts of 5–7 existing members, using a bounded query for names, departments and profile pictures. Cohort assignments rotate deterministically through current board, core and honorary members; these are **not historical records**. Contributions and initial memories are explicitly labelled fictional examples. No personal records or example identities are committed.

New comments are React state scoped to the mounted page. They can be posted and deleted but disappear when leaving/reloading. There is no mutation API, database table, migration, or browser persistence in this experiment. This is intentional: approve the visual concept and provide real tenure/contribution data before implementing a permanent archive.

The visual treatment uses botanical branch connectors, serif chapter labels, avatar nodes, Radix dialogs and outlined interactions. Horizontal scrolling is confined to the cohort on small screens; motion respects reduced-motion preferences.

For a permanent version, model board tenures separately from current membership roles, keep historical departments on those tenures, and add authenticated comments with author ownership and moderation. Do not infer past board years from honorary status or joining dates.
