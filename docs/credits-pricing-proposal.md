# Launch Credits pricing proposal — not active

Goal: Lovable-style Credits with transparent, affordable pricing for Malaysian users. These are proposed local launch packages, not verified percentage discounts against Lovable's current plans. No automatic credit issuance or charging is enabled.

| MYR payment | Credits | MYR per Credit |
| --- | --- | --- |
| RM 39 | 100 | 0.39 |
| RM 99 | 300 | 0.33 |
| RM 199 | 700 | about 0.2843 |

Proposed usage: 1 Credit per successful initial website generation, 0.5 Credit per successful AI revision, no charge for failed requests, manual editing, previews, saves or exports. This is deliberately simpler than Lovable's variable task pricing and must not be described as identical billing. Before activation, validate maximum prompt/output limits and real provider costs to avoid an unbounded cost per fixed Credit. Credit grants, refunds and deductions need a transactional, auditable ledger.

Manual bank/TNG receipts and Stripe payment declarations must be verified before issuing Credits. USDT conversion remains undefined: no exchange rate is assumed, no Credits are issued for a declaration. These proposed top-up bundles do not silently introduce recurring subscriptions or expiry terms.

The UI currently accepts payment declarations only. Do not imply these proposal packages are active or that the account has received usable Credits. Activation requires the final price rules and a verified settlement/administrative review flow.

## Implemented state

The packages above are now server-configured for manual MYR settlement approval. Balance, ledger and review UI exist. AI charging remains disabled by default (`KD_CREDITS_BILLING` must explicitly be `enabled`). No administrator is automatically assigned. The requested owner account hello@kennystudio.cfd must first be registered, then its immutable account ID bound through KD_ADMIN_USER_IDS. This supersedes the earlier statement that no grant/deduction code exists: the code is tested, while live settlement and billing activation remain pending. This is not a verified percentage discount against Lovable.
