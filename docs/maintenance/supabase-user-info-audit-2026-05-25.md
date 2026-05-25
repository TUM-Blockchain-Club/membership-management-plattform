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

## Missing `TBC Email` CSV Match Check

A follow-up read-only check looked at the 38 `members_main` rows with blank
`TBC Email` values and matched them against the CSV by normalized name.

High-confidence matches found in the CSV:

| `members_main.id` | Supabase name | CSV name | CSV primary email |
|---:|---|---|---|
| 71 | Indrakshee Mukherjee | indrakshee mukherjee | indrakshee.mukherjee@tum-blockchain.com |
| 34 | Berke Bora | Ahmet Berke Bora | ahmet.bora@tum-blockchain.com |
| 74 | Jakob Hofmann | Jakob Leonhard Hofmann | jakob.hofmann@tum-blockchain.com |
| 79 | Joshua Großkelwing | Joshua Grosskelwing | joshua.grosskelwing@tum-blockchain.com |
| 64 | Fynn Endreß | Fynn Endress | fynn.endress@tum-blockchain.com |

Likely but needs manual confirmation:

| `members_main.id` | Supabase name | CSV candidate | CSV primary email | Note |
|---:|---|---|---|---|
| 16 | Adrian Kögl | Adrian Koegl | adrian.koegl@tum-blockchain.com | Umlaut transliteration / spelling variant. |
| 43 | Daniel Wollschläger | Daniel Wollschlaeger | daniel.wollschlaeger@tum-blockchain.com | Umlaut transliteration / spelling variant. |
| 55 | Elisa Lübben | Elisa Luebben | elisa.luebben@tum-blockchain.com | Umlaut transliteration / spelling variant. |
| 112 | Saifulla Tanikulov | Saifullozhon Tanikulov | saifullozhon.tanikulov@tum-blockchain.com | Different first-name form. |

The remaining missing-email rows did not have a reliable CSV match by name.
Several low-score fuzzy suggestions were ignored because they only shared a
first name or a few letters.

## Applied Email Updates

After user confirmation, the nine matched `TBC Email` values above were written
to `public.members_main` on 2026-05-25.

Post-update verification:

- `members_main` rows: 139
- Rows with non-empty `TBC Email`: 110
- Rows still missing `TBC Email`: 29

## Department CSV Comparison

A follow-up read-only department comparison matched Supabase members to the CSV
by `members_main."TBC Email"` and normalized CSV `Org Unit Path` values:

- `/Industry` -> `Industry`
- `/Web3talents` -> `Web3 Talents`
- `/Research and Development` -> `Research`
- `/IT and Development` -> `IT & Development`
- `/Legal and Finances` -> `Legal & Finance`
- `/External Affairs` -> `External Relations`
- `/Marketing` -> `Marketing`

No Supabase changes were made during this check.

Members with blank Supabase `Department` but a department in the CSV:

| `members_main.id` | Supabase name | TBC email | CSV org unit | Proposed department | CSV status |
|---:|---|---|---|---|---|
| 181 | anton.kazarinov | anton.kazarinov@tum-blockchain.com | `/Industry` | Industry | Active |
| 36 | Cem Denizsel | cem.denizsel@tum-blockchain.com | `/Research and Development` | Research | Active |
| 40 | Daniel Moreno | daniel.moreno@tum-blockchain.com | `/Research and Development` | Research | Suspended |
| 57 | Eugenio Vairo | eugenio.vairo@tum-blockchain.com | `/Research and Development` | Research | Active |
| 69 | Huixu Liu | huixu@tum-blockchain.com | `/Research and Development` | Research | Suspended |

Department mismatches between Supabase and CSV:

| `members_main.id` | Supabase name | TBC email | Supabase department | CSV org unit | CSV department | CSV status |
|---:|---|---|---|---|---|---|
| 64 | Fynn Endreß | fynn.endress@tum-blockchain.com | Industry | `/Marketing` | Marketing | Active |
| 66 | Gopi Mehta | gopi.mehta@tum-blockchain.com | Web3 Talents | `/Research and Development` | Research | Active |
| 84 | Kerem Eskici | kerem.eskici@tum-blockchain.com | External Relations | `/Web3talents` | Web3 Talents | Active |
| 113 | Salan Isaqzoi | salan.isaqzoi@tum-blockchain.com | External Relations | `/Web3talents` | Web3 Talents | Active |

Multi-department row that already includes the CSV department:

| `members_main.id` | Supabase name | TBC email | Supabase department | CSV org unit | CSV department |
|---:|---|---|---|---|---|
| 141 | Yehor Kubakh | yehor.kubakh@tum-blockchain.com | IT & Development, Research | `/IT and Development` | IT & Development |

Rows with blank Supabase `Department` that could not be matched to a CSV
department by TBC email:

`admin`, `Ali`, `Artur Morozas`, `Felix Kania`, `Ismail Kuzu`,
`Julian Baumann`, `Moritz Schindelmann`, `Sebastian Kreutz`, `t`, `ttt`,
`Valentin Hartig`, `Yannik Fräbel`.

## Applied Department Updates

After user confirmation, the following department updates were written to
`public.members_main` on 2026-05-25:

| `members_main.id` | Supabase name | Applied department |
|---:|---|---|
| 181 | anton.kazarinov | Industry |
| 36 | Cem Denizsel | Research |
| 40 | Daniel Moreno | Research |
| 57 | Eugenio Vairo | Research |
| 69 | Huixu Liu | Research |
| 64 | Fynn Endreß | Marketing |

User-confirmed rows intentionally left unchanged:

| `members_main.id` | Supabase name | Department kept |
|---:|---|---|
| 66 | Gopi Mehta | Web3 Talents |
| 84 | Kerem Eskici | External Relations |
| 113 | Salan Isaqzoi | External Relations |
| 141 | Yehor Kubakh | IT & Development, Research |

Post-update verification:

- `members_main` rows: 139
- Rows still missing `Department`: 23
