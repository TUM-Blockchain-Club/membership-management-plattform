# Member Editor Save Payload

The member editor saves only the fields owned by the profile form.

Before this change, the save flow copied the full `editedMember` object into the
Supabase `PATCH` payload. The first edit on `/members` often started from the
route's narrow `MEMBER_COLUMNS` selection, but the update response used
`select('*')`. A second edit could therefore send extra database columns back to
Supabase, even though the form did not own those fields.

`getEditableMemberPayload` in `app/dashboard/lib/memberUtils.ts` now whitelists
the profile editor fields before create/update calls. This keeps repeated saves
stable and avoids accidentally writing metadata columns such as `UUID`, `Batch`,
or NFT fields from the member editor.
