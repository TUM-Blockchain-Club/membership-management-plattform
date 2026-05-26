# Event Interest Backfill - 2026-05-26

## Summary

Backfilled `public.event_interest` rows from the CSV `Interested` column in:

`Hackathons & Conferences 207486d1154d801b8626d60e0fa5a375.csv`

The backfill used `scripts/backfill-event-interest-from-csv.mjs`.

## Matching Rules

- CSV event names were matched to `events.title` using normalized exact title matching.
- CSV interested names were matched to `members_main.Name`.
- Exact normalized member-name matches were accepted.
- Unique partial member-name matches were accepted.
- Ambiguous or missing member-name matches were skipped.
- Inserts used `upsert` on `(event_id, member_id)` so existing interest rows were preserved.

## Result

- CSV rows read: 19
- Matched interest entries: 49
- Unique `event_interest` rows ensured: 49
- Unmatched event titles: 0
- Unmatched interested names: 5
- Live `event_interest` total after backfill: 54

Unmatched names:

- `EthConf`: `Srini`
- `Pragma Tokyo`: `Srini`
- `ETHGlobal Tokyo`: `Srini`
- `ETHGlobal Tokyo`: `Elena Grütter`
- `Devcon 8`: `Srini`

## Verification Counts

| Event | Interest count |
| --- | ---: |
| Crypto Valley Conference | 1 |
| Istanbul Blockchain Week | 1 |
| EthConf | 2 |
| ETHGlobal New York | 7 |
| Solana Summit Germany | 5 |
| DappCon | 1 |
| Dutch Blockchain Week Summit | 1 |
| Cashflow Conference | 1 |
| Conf3rence | 2 |
| Pragma Tokyo | 7 |
| ETHGlobal Tokyo | 8 |
| Sui Basecamp | 6 |
| Token 2049 Singapore | 6 |
| Devcon 8 | 6 |
