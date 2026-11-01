# Payment requirements

Confirmed user preferences:

- Malaysian customers: Touch ’n Go eWallet and Hong Leong Bank.
- International customers: Stripe and USDT.

Payment instructions, the supplied Stripe Payment Link, authenticated declaration submission and private declaration records are implemented. No automated settlement, payment verification or Credits grant is implemented. Environment publication is separate from application hosting and payment activation.

Required business inputs: plan prices, currency, recurring subscription versus one-time purchase, the TNG/HLB merchant or acquiring gateway, and USDT network/processor. Do not assume a personal bank account or wallet provides a checkout API. Gateway support must be checked against the selected merchant product and official documentation.

Implementation must create orders on the server using server-controlled prices, associate purchases with the authenticated account, verify provider callbacks, handle duplicate events idempotently, and grant paid access only after verified settlement. The return/success page must never be treated as proof of payment. USDT settlement must verify the intended network, asset, receiving address, amount, confirmations and unique transaction; screenshots are not settlement evidence. Never request seed phrases or private keys.

Provider credentials must be configured securely after choosing the services. Do not put credential values, wallet private keys or passwords in repository files or chat. Callback verification secrets require a supported local secret binding; a proxy placeholder cannot be used as a raw cryptographic signing key. No external deployment or payment activation is authorized by merely adding integration code.


## Current recharge flow

The service is offered to Malaysian users. Declarations require a Malaysian-user attestation; this is not verified residency or geolocation. MYR bank/eWallet amounts and original USDT amounts are stored without conversion. Stripe declarations require the receipt currency (MYR or USD); the Payment Link price/currency is controlled externally and is not inferred from the link. Only submit the exact receipt amount. Declarations remain `pending_review`, never increment a balance and are not proof of settlement. No verification admin UI or payment-provider webhook is connected yet. The recipient QR attachment could not be read as a local asset and is not recreated; the UI explicitly states it is unavailable.

The owner requested Lovable-style Credits. The public Lovable pricing page checked on 2026-11-01 states credit value and consumption vary with plan and feature, so it cannot supply a single fixed MYR or USDT conversion. Credits pricing/issuance and consumption rules remain unconfigured pending the owner's selection. Reference: https://lovable.dev/pricing .

`data/deposits.json` is an ignored private data file and must be backed up with users/projects. Duplicate reference numbers are rejected per payment method, including concurrent submissions. No untrusted declaration changes payment status or issues Credits.

## Current simplified workflow — supersedes earlier manual conversion limitations

Package-first, server-issued quotes now lock amounts, Credits and MYR-per-unit rates for 30 minutes. Users submit the quote ID plus the transaction reference; client-supplied amount/rate/Credits cannot override the quote. New USDT and USD declarations with valid quote snapshots can be approved through the same one-confirmation flow as MYR. Old non-MYR declarations without quotes are not automatically converted. Administrators configure uniform USDT/USD quotations after verifying their chosen commercial rate; unset rates keep those methods unavailable for quoting. No market-rate feed or automatic provider verification has been added.
