# Automatic Donation-To-Bank Setup

The current website sends a donation pledge through WhatsApp/email. To make donations go automatically to the organization bank account, the site needs a licensed payment gateway.

## Recommended Flow

1. Open an organization or nonprofit merchant account with a gateway that supports Uganda.
2. Add the foundation settlement bank account in that gateway dashboard.
3. Complete KYC verification.
4. Get live API credentials.
5. Add those credentials to `.env`.
6. Enable checkout and webhooks on this Node server.
7. Deploy the website on HTTPS.

## Bank Details Usually Needed

- Account name: `AL-IHSAN CHARITY FOUNDATION`
- Bank name
- Branch
- Account number
- SWIFT/BIC for international settlement
- Currency: usually `UGX` and optionally `USD`
- Bank reference letter or cancelled cheque if the provider asks for it
- Organization registration certificate or nonprofit documents
- Director/contact ID documents
- Physical address, website URL, phone, email

## ABSA Uganda Bank Transfer Setup

The master page includes an **ABSA Uganda settlement** panel. Add only safe receiving details:

- account name;
- bank name;
- branch;
- account number;
- SWIFT/BIC;
- currency;
- donor transfer reference;
- public reconciliation instructions.

Do not enter ABSA online banking usernames, passwords, one-time passwords, card numbers, or CVVs into the website. Bank transfer receiving details can be shown to donors, but online banking credentials must never be stored in this project.

When the ABSA account number is saved, the donate page automatically changes bank transfer from “request only” to a live verified ABSA transfer option. Donors still need to send proof so the foundation can reconcile the transfer with the selected charity cause.

## Gateway Options To Consider

- Pesapal Uganda: cards, mobile money, payment links, API/plugins, UGX and USD.
- Flutterwave Uganda: cards and mobile money, with bank/mobile money settlement after KYC.
- MTN MoMo Open API: direct mobile money collections; collections are held in a vendor account before liquidation to the bank.
- Relworx: Uganda MTN/Airtel Mobile Money and Visa API.
- Yo Uganda: local mobile money aggregation and bank transfers.

## MTN MoMo Collections Setup

This project now includes a server-side MTN MoMo `RequestToPay` integration. It is disabled until real credentials are added.

Important distinction:

- MTN MoMo `RequestToPay` bills the donor's MTN Mobile Money wallet. The donor confirms on their phone with their MoMo PIN.
- An MTN/Mastercard virtual card is for spending online. It is not a safe way to receive website donations into your organization.
- Do not put card numbers, expiry dates, or CVVs into HTML, JavaScript, `.env`, screenshots, chat, or code.

Required MTN values:

- `MTN_MOMO_ENABLED=true`
- `MTN_MOMO_BASE_URL`
- `MTN_MOMO_TARGET_ENVIRONMENT`
- `MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY`
- `MTN_MOMO_API_USER`
- `MTN_MOMO_API_KEY`
- `MTN_MOMO_CURRENCY`
- `MTN_MOMO_MERCHANT_PHONE`

For sandbox testing, MTN examples commonly use the sandbox URL and test currency configured by MTN. For live Uganda collections, confirm the live currency and settlement process with MTN during onboarding. Do not assume USD is available until MTN enables it for your merchant/API product.

The merchant contact phone configured for this project is:

- `MTN_MOMO_MERCHANT_PHONE=256780937446`

The donor phone is entered by the donor on the public website. The site sends a RequestToPay prompt to that donor phone; the donor approves or rejects it from their MTN Mobile Money account.

## Exact MTN Dashboard Items To Collect

From the MTN MoMo Developer dashboard, collect these values and add them through the protected master page:

```env
MTN_MOMO_ENABLED=true
MTN_MOMO_BASE_URL=https://sandbox.momodeveloper.mtn.com
MTN_MOMO_TARGET_ENVIRONMENT=sandbox
MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY=...
MTN_MOMO_API_USER=...
MTN_MOMO_API_KEY=...
MTN_MOMO_CURRENCY=...
MTN_MOMO_MERCHANT_PHONE=256780937446
```

The protected master page now includes an **MTN MoMo connector**. Use it to:

- see the exact missing MTN credential;
- save MTN keys into the server-side `.env` file without exposing them to the public website;
- provision a sandbox API User/API Key automatically after you paste a valid Collections primary subscription key;
- keep the public donation page clean while the private setup work stays behind login.

Current local status: MTN is disabled and missing a Collections subscription key, API user, and API key. The payment page will therefore keep MTN disabled and guide donors to WhatsApp, bank request, or other manual methods until MTN is connected.

For production, MTN must provide or confirm:

- Production base URL
- Production target environment value
- Live collection subscription key
- Live API user
- Live API key
- Approved transaction currency
- Merchant account or merchant number receiving funds
- Settlement/liquidation method to the bank

The site already has these routes:

- `GET /api/payments/mtn/status`
- `POST /api/payments/mtn/request-to-pay`
- `GET /api/payments/mtn/:referenceId`

## Implementation Notes

- Never put secret keys in frontend JavaScript.
- Donations must be created server-side.
- Webhooks must verify signatures before marking donations paid.
- Use HTTPS in production.
- Store donation records with gateway reference, amount, currency, cause, donor contact, status, and timestamp.
- Reconcile gateway reports with bank statements.
- The donor portal uses email-code login and only shows donations tied to the same donor email contact.
- The master page now exposes a production-readiness board for HTTPS, live email, MTN production, card checkout, and ABSA receiving.

## Next Code Step

After choosing the provider, implement:

- `POST /api/payments/create`
- `POST /api/payments/webhook`
- `GET /api/payments/status/:reference`
- public checkout button
- master dashboard payment report
