# Newsletter board access

The newsletter route passes the dashboard's `showNewsletterTab` permission to
`NewsletterPage` as `canManageNewsletter`. Navigation, workspace rendering, and
initial data loading therefore use the same rule: board members or special-access
users, except while member-view mode is enabled.

Previously, the route passed only `effectiveHasSpecialAccess`, so board members
could see the navigation entry but received an access-required message.

The server API and database continue to enforce
`check_email_can_manage_newsletter`; no role grants or schema changes are needed.

`tests/newsletter-access.test.ts` renders the actual route and workspace for a
board member without special access, a special-access user, an ordinary member,
and the dashboard permission while member-view mode is enabled.
