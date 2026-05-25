# Strapi To Supabase Members Audit - 2026-05-25

Read-only comparison of Strapi `/api/members` against Supabase
`public.members_main`.

The Strapi API token was used only for read-only requests and was not written to
this repository.

## Match Summary

- Strapi members: 132
- Supabase `members_main` rows: 139
- Strapi members matched to Supabase: 132
- Match method: all 132 matched by Strapi `supabase_id`
- Strapi members missing in Supabase: 0
- Supabase rows missing in Strapi: 7

## Status Summary

Strapi `membership_status` counts:

- `core`: 56
- `honorary`: 10
- `alumni`: 31
- `advisor`: 6
- `passive`: 15
- `exit`: 11
- `kicked_out`: 2
- `unknown`: 1

Supabase `Status` counts:

- `Active`: 57
- `Honorary`: 10
- `Alumni`: 34
- `Advisor`: 7
- `Passive`: 15
- `Left`: 9
- `Kicked out`: 2
- blank: 5

Treating Strapi `core` as active and Supabase `Active` as active:

- Strapi active members: 56
- Supabase active members: 57
- Active-status mismatches among matched members: 1

Active-status mismatch:

| Supabase id | Name | Email | Strapi status | Supabase role | Supabase status |
|---:|---|---|---|---|---|
| 92 | Lukas Heine | lukas.heine@tum-blockchain.com | core | Ex-Core Member | Alumni |

Supabase active members not present in Strapi:

| Supabase id | Name | Email | Department |
|---:|---|---|---|
| 97 | Maximilian Rentz | maximilian.rentz@tum-blockchain.com | Legal & Finance |
| 127 | Timo Zhao | timo.zhao@tum-blockchain.com | Legal & Finance |

## LinkedIn Comparison

Among the 132 matched members, there was one LinkedIn difference:

| Supabase id | Name | Email | Strapi LinkedIn | Supabase LinkedIn |
|---:|---|---|---|---|
| 47 | Deniz Yavas | deniz.yavas@tum-blockchain.com | `https://www.linkedin.com/in/denizyavasxyz/` | blank |

## Supabase Rows Missing In Strapi

| Supabase id | Name | Email | Status | Role | Department | LinkedIn |
|---:|---|---|---|---|---|---|
| 97 | Maximilian Rentz | maximilian.rentz@tum-blockchain.com | Active | Core Member | Legal & Finance | `https://www.linkedin.com/in/maximilian-rentz/` |
| 127 | Timo Zhao | timo.zhao@tum-blockchain.com | Active | Core Member | Legal & Finance | blank |
| 149 | ttt | ttt@tum-blockchain.com | blank | GUEST | blank | blank |
| 153 | Ali | aaaaaali@tum-blockchain.com | blank | blank | blank | blank |
| 154 | t | blank | Left | blank | blank | blank |
| 0 | admin | blank | blank | blank | blank | blank |
| 181 | anton.kazarinov | anton.kazarinov@tum-blockchain.com | blank | GUEST | Industry | blank |

## Notes

No Supabase or Strapi changes were made for this audit.

The next cleanup pass should decide how to map non-active statuses exactly:
Strapi `exit` likely corresponds to Supabase `Left`, while `unknown` likely
needs manual review before changing either side.

## Applied Cleanup

After user confirmation, the following Supabase updates were applied on
2026-05-25:

| Supabase id | Name | Field | Applied value |
|---:|---|---|---|
| 47 | Deniz Yavas | `Linkedin` | `https://www.linkedin.com/in/denizyavasxyz/` |
| 97 | Maximilian Rentz | `Status` | `Passive` |
| 127 | Timo Zhao | `Status` | `Passive` |

Post-update Supabase `Status` counts:

- `Active`: 55
- `Passive`: 17
- `Alumni`: 34
- `Advisor`: 7
- `Honorary`: 10
- `Left`: 9
- `Kicked out`: 2
- blank: 5
