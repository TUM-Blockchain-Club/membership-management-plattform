# Member Home

Authenticated members land on `/home`. The page uses the shared dashboard shell and presents the member's current Coffee Chat action, key profile fields, next upcoming event, and common destinations.

`/dashboard` remains as a compatibility redirect to `/home`. OAuth, magic-link, root-route, and local development redirects also use `/home` as their default destination.

The page composes data already loaded by the dashboard layout with `loadCoffeeChatHome`; it does not add tables, APIs, or persistence.
