# Supabase User Info Audit - 2026-05-25

Read-only audit comparing the Google Admin CSV attachment
`User_Download_25052026_212315.csv` with the live Supabase project.

No Supabase writes or migrations were run.

## Sources Checked

- CSV rows: 160 users, 160 unique primary emails.
- Supabase `public.members_main`: 139 rows.
- Supabase Auth users: 36 users.
- App lookup path: signed-in users are resolved by matching Supabase Auth `email`
  to `members_main."TBC Email"`.

## Live `members_main` Fields

The current member profile table exposes:

- Identity/profile: `id`, `created_at`, `Name`, `Picture`, `nickname`
- Membership: `Role`, `Status`, `Department`, `Batch`, `Semester Joined`
- Education: `Uni`, `Bachelor/Master`, `Degree`, `degree_at_uni`
- Contact: `TBC Email`, `Private Email`, `Phone`
- Social: `Linkedin`, `Telegram`, `Discord`, `Instagram`, `Twitter`
- Work/internal: `Project/Task`, `Area of Expertise`, `highlight`
- NFT: `UUID`, `nft_avatar`, `nft_consent`
- Merch: `Size Merch`

## Field Fill Counts In `members_main`

Out of 139 rows:

- `Name`: 139
- `Role`: 136
- `Status`: 134
- `Department`: 111
- `Picture`: 108
- `TBC Email`: 101
- `Linkedin`: 113
- `Bachelor/Master`: 94
- `UUID`: 28
- `Uni` / `degree_at_uni`: 12 each
- `Telegram`: 13
- `Instagram`: 19
- `Twitter`: 15
- `Size Merch`: 7
- `Phone`: 3
- `Private Email`: 2
- `Discord`: 2
- `Degree`, `Area of Expertise`, `Semester Joined`, `highlight`, `nft_avatar`: 1 each
- `Project/Task`, `nickname`: 0
- `nft_consent`: 139

## CSV To Supabase Email Match

- CSV emails found in `members_main."TBC Email"`: 99 / 160
- CSV emails not found in `members_main."TBC Email"`: 61 / 160
- `members_main` rows with no usable `TBC Email`: 38 rows, inferred from
  139 rows minus 101 non-empty `TBC Email` values.
- CSV emails found in Supabase Auth: 34 / 160
- CSV emails not found in Supabase Auth: 126 / 160

## CSV Columns Already Represented

- First + last name can map to `members_main.Name`.
- Primary email can map to `members_main."TBC Email"` and Supabase Auth `email`.
- Org unit path can likely map to `members_main.Department`, but this is not a
  direct field match because CSV values are paths such as `/Web3talents`.
- Google status can likely map to `members_main.Status`, but meanings should be
  normalized before import.
- Recovery email / work secondary email can map only partially to
  `members_main."Private Email"`; the current schema has one private email field,
  not separate recovery/home/work email fields.
- Recovery phone / work phone can map only partially to `members_main.Phone`;
  the current schema has one phone field.
- Last sign-in exists in Supabase Auth as `last_sign_in_at`.

## CSV Columns Not Represented As Dedicated Member Fields

- Password and password hash function.
- New primary email.
- Separate recovery/home/work secondary emails.
- Separate recovery/work/home/mobile phone numbers.
- Work and home addresses.
- Employee ID, employee type, employee title, manager email, cost center.
- 2-step verification enrolled/enforced.
- Building ID, floor name, floor section.
- Email, Drive, Photos, and total storage usage/limit.
- Change password at next sign-in.
- New status upload field.
- Advanced Protection Program enrollment.
- Gemini limit status.

## Notes

The repo still contains an older `supabase/README.md` that refers to
`supabase/schema.sql` and `mmp.members`, but the checked-out repo does not
contain `supabase/schema.sql`, and the app code uses `public.members_main`.
