---
id: raast-p2m-acquiring-suite
title: P2M Acquiring Suite — Partner Integration & Technical Reference
sidebar_label: RAAST P2M Acquiring Suite
sidebar_position: 1
---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Business Need & Objective](#2-business-need--objective)
3. [Solution Overview](#3-solution-overview)
4. [System Architecture & Technical Specification](#4-system-architecture--technical-specification)
5. [Authentication & Session Model](#5-authentication--session-model)
6. [API Reference — All Domains](#6-api-reference--all-domains)
   - 6.1 [Auth Domain](#61-auth-domain-1-endpoint)
   - 6.2 [QR Domain](#62-qr-domain-4-endpoints)
   - 6.3 [Payment Domain](#63-payment-domain-7-endpoints)
   - 6.4 [Merchant Domain](#64-merchant-domain-8-endpoints)
   - 6.5 [Onboarding Domain](#65-onboarding-domain-2-endpoints)
7. [Complete Response Code Reference](#7-complete-response-code-reference)
8. [Reference Data](#8-reference-data)
9. [Configuration & Environment Reference](#9-configuration--environment-reference)
10. [Partner Integration Guide — Building a Wrapper](#10-partner-integration-guide--building-a-wrapper)
11. [Sandbox Boundary & Roadmap to Going Live](#11-sandbox-boundary--roadmap-to-going-live)

---

## 1. Executive Summary

Tapsys is extending the **P2M Acquiring Suite** — part of the broader **Open Digital Acquiring** product line — to banking corporates and partners across Pakistan and international geographies (Tanzania, Togo).

Historically, the main bottleneck before any integration work could even start were to:

- **VPN provisioning and network-access requests** between two corporates routinely take weeks — security reviews, firewall change tickets, IP whitelisting, VPN certificate exchange — before a single API call can be attempted.
- **The Technical Specification Document (TSD)** — a 30+ page PDF — would float between business, technical, and partner teams over email, with no way for anyone to actually *try* a request against it.
- Sales and business teams had **no way to demo** SQRC/DQRC generation or Request-to-Pay to a prospective partner without looping in engineering for a bespoke, one-off setup every time.

**This sandbox exists to remove that bottleneck entirely.** It is a fully working, self-serve simulation of the P2M Acquiring Gateway — implementing every endpoint in TSD-Acq-API-GW v1.17 with real request validation, real EMVCo-correct QR payloads, real maker-checker onboarding, and real state-machine behavior (timers, probability-weighted outcomes, one-time-use enforcement) — reachable over a normal internet connection, with no VPN, no firewall change, and no engineering hand-holding required.

**The core value proposition:**

Our sales team can onboard a corporate or partner bank's technical stakeholders directly — hand them a URL and credentials — and they can read the exact contract for every endpoint, populate every field themselves, fire a real request, and get a real (simulated) response back, entirely self-serve, before any VPN exists and before a single line of real integration code is written.

This document is the single comprehensive reference for that sandbox: the business case, the architecture, every API endpoint with full request/response specifications, and a practical guide to building a wrapper that maps our endpoints onto a partner's own internal systems.

## 2. Business Need & Objective

### 2.1 The problem

| Stakeholder | What they were blocked on |
|---|---|
| Sales / Business Development | No way to demonstrate SQRC/DQRC generation or Request-to-Pay to a prospective corporate/partner without engineering standing up a one-off environment each time. |
| Partner-bank engineers | No contract to build against before their own sandbox existed — only a static PDF (the TSD), which is not something you can send a request to. |
| Internal QA | No stable target to validate the full endpoint spec against, field by field, before a real integration made mistakes expensive. |
| Everyone, jointly | VPN provisioning, network access forms, and firewall approvals across *every* corporate's own (different) infrastructure and security posture — timelines measured in weeks, not hours. |

### 2.2 The objective

Build a system that:

1. **Behaves like the real gateway** closely enough that no integration work done against it is wasted once a real bank connection exists.
2. **Is governed well enough** to be handed to an *external* partner bank or corporate — not just used internally — with account approval, per-domain permissions, and a full audit trail.
3. **Requires no VPN or private network access** — reachable over the public internet like any normal API, so a partner's technical team can start integrating the same day sales makes contact.
4. **Is structured so that swapping simulated behavior for a real upstream connection is a configuration change — not a rewrite.**

Two commitments shaped every decision in this build:

- **Nothing is hidden** — every field and response code in the TSD is a real input or a labelled value, never summarized away.
- **Nothing here is a dead end** — every domain already has a seam built for the day a real bank connection exists.

## 3. Solution Overview

Three independently deployable applications sit in front of one backend. Each answers one part of the problem above.

| Application | Runs as | Answers |
|---|---|---|
| **acquiring-gateway** (backend) | Spring Boot · :4000 | *Is there a real contract to build against?* Implements every TSD endpoint with genuine application logic (state machines, timers, probability-weighted outcomes) — not canned responses. |
| **Developer Portal** (user-frontend) | React · :5173 dev / :8080 docker | *Can a partner's engineer see and try every field?* A self-serve UI with an in-app reference panel and live API console showing every request/response. |
| **Admin Portal** (admin-frontend) | React · :5175 dev / :8081 docker | *Can this be governed, not just demoed?* Approves accounts, grants per-domain API permissions, revokes sessions, reviews an audit trail. |

The mechanism that makes "no VPN, no rewrite later" real is a pattern applied identically across all six API domains — **auth, qr, payment, merchant, onboarding**:

| Layer | Role | Example |
|---|---|---|
| Domain interface | Defines the contract once per domain | `interface QrService` |
| Mock implementation | Simulates the domain in-memory — timers, state machines, real EMVCo QR generation, no external calls | `MockQrService` (active today) |
| Live implementation | Plumbing to call a real upstream service, wired against the *same* DTOs, dormant until pointed at a real URL | `LiveQrService` (dormant until go-live) |
| Router | Picks Mock or Live per request, flippable at runtime, no restart | `QrRouter` |

## 4. System Architecture & Technical Specification

### 4.1 Technology stack

**Backend — acquiring-gateway**

| Layer | Choice |
|---|---|
| Language | Java 17 |
| Framework | Spring Boot 3.3.4 |
| Persistence | Spring Data JPA · H2 (file mode) |
| Auth | Hand-rolled HS512 JWT (sandbox token) + BCrypt-hashed portal sessions |
| QR / EMVCo | ZXing (core + javase) + custom TLV builder and CRC-16/CCITT-FALSE checksum |

**Developer Portal — user-frontend**

| Layer | Choice |
|---|---|
| Language | TypeScript 5.5 |
| Framework | React 18.3 · Vite 5.2 |
| Styling | Tailwind CSS 3.4 |
| Prod serving | nginx (Docker) |

**Admin Portal — admin-frontend**

| Layer | Choice |
|---|---|
| Language | TypeScript 5.5 |
| Framework | React 18.3 · Vite 5.2 |
| Deployment | Separate container, own port, own login |
| Talks to | `/api/portal/**` only |

### 4.2 Deployment topology

```bash
docker compose up --build
```

| Service | Container | Host port | Persists |
|---|---|---|---|
| acquiring-gateway | acquiring-backend | 4000 | H2 file DB on a named Docker volume |
| Developer Portal | acquiring-frontend | 8080 (5173 dev) | — |
| Admin Portal | acquiring-admin-frontend | 8081 (5175 dev) | — |

Three containers, direct host-port publishing, no reverse proxy. Backend runs as a non-root user in a JRE-Alpine image with JVM heap capped at 75% of container memory. Both frontends are Vite/React SPAs built to static assets and served by nginx.

### 4.3 Endpoint coverage

All 28 requests across 6 TSD-mirroring domains (22 distinct TSD-numbered endpoints, plus sandbox-only helper endpoints needed to demo end-to-end flows: simulated scan-and-pay, mock merchant callback receivers).

| Domain | Endpoints | What it proves out |
|---|---|---|
| auth | 1 | Aggregator token issuance — the entry point every other call depends on |
| qr | 4 | EMVCo-correct SQRC/DQRC generation with real TLV encoding and CRC-16 |
| payment | 7 (3 TSD + 4 sandbox helpers) | Settlement callbacks and reconciliation |
| merchant | 8 | Full merchant lifecycle after onboarding — status, profile, documents |
| onboarding | 2 | Maker-checker draft submission with automatic reviewer resolution |

## 5. Authentication & Session Model

The gateway runs two entirely separate authentication mechanisms — one for API partners, one for the demo portals. **Partners integrating against the API only need the first one.**

### 5.1 Sandbox API token — `POST /api/v2/getToken` (TSD 3.1)

Exchanges a static `aggregatorCode` + `clientSecret` for a bearer token used on every subsequent call.

- **Token shape:** a real, self-signed **JWT (HS512)** — header `{"alg":"HS512"}`, payload `{"sub":"<aggregatorCode>","exp":<now+3600>,"deviceId":"sandbox","iat":<now>}`.
- **Lifetime:** exactly **1 hour** (3600 seconds), fixed.
- **Header to send on every subsequent call:** `Authorization: Bearer <token>`
- **Renewal:** no refresh-token endpoint — call `getToken` again for a fresh hour.

:::note Sandbox note
In this build, the token is *issued* correctly but not yet *enforced* by a servlet filter on downstream calls (every domain will accept a request even without the header today). **Partners should always send the Bearer token on every call regardless** — the live backend behind a real partner connection is expected to enforce it, and building the habit now costs nothing later.
:::

### 5.2 Provider routing (mock vs. live)

Every domain is fronted by a router that reads a live settings store on every request and dispatches to either the sandbox (Mock) or a real upstream (Live) implementation — flippable via an admin endpoint, no restart required. This is what lets one domain go live for one partner while the rest stay sandboxed.

### 5.3 Developer/Admin portal sessions (not part of the partner API contract)

A separate, opaque server-side session mechanism secures the two demo portals themselves (register/login/BCrypt passwords/per-domain permissions/audit log). This is unrelated to partner API integration and can be ignored by an external partner building a system-to-system wrapper — it only matters if your team is using our portal UI directly.

## 6. API Reference — All Domains

Base URL (sandbox default): `http://localhost:4000` (or the hosted sandbox URL provided to you).
All request/response bodies are JSON (`Content-Type: application/json`) unless noted otherwise.
**Every error response**, regardless of endpoint, carries both key-casing conventions simultaneously:

```json
{
  "response_code": "<code>",
  "response_desc": "<description>",
  "responseCode": "<code>",
  "responseDescription": "<description>"
}
```

### 6.1 Auth Domain (1 endpoint)

#### `POST /api/v2/getToken` — Get Token (TSD 3.1)

Exchanges aggregator credentials for a bearer token.

**Headers:** `Content-Type: application/json`

**Request:**

| Field | Type | Required | Example |
|---|---|---|---|
| aggregatorCode | string | Yes | `"20"` |
| clientSecret | string | Yes | `"112222321312356AC42"` |

```json
{ "aggregatorCode": "20", "clientSecret": "112222321312356AC42" }
```

**Response (200):**

```json
{
  "response_code": "00",
  "response_desc": "Processed OK",
  "data": { "token": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiIyMCIsImV4cCI6MTc1ODc5NjQwMH0...." }
}
```

**Errors:** 119 Invalid request params (400) · 130 Unable to handle HTTP request (500) · 503 Mpay response null or timed out (502, live mode only)

**Sample call:**

```bash
curl -X POST http://localhost:4000/api/v2/getToken \
  -H "Content-Type: application/json" \
  -d '{"aggregatorCode":"20","clientSecret":"112222321312356AC42"}'
```

### 6.2 QR Domain (4 endpoints)

The QR domain generates EMVCo-style Tag-Length-Value (TLV) QR payloads. Every SQRC/DQRC is persisted, backing one-time-use enforcement for DQRC and a demo scan-and-pay simulator.

**TLV construction, in brief:** every element is `TT LL VVVV` (2-digit tag, 2-digit decimal length, raw value); template tags nest another full TLV string as their value. Top-level tags: `00` Payload Format, `01` Point of Initiation (`11`=static/SQRC, `12`=dynamic/DQRC), `28` Merchant Account Info (template), `52` MCC, `53` Currency (`586`=PKR, fixed), `54` Amount (omitted if absent — multi-use SQRC), `58` Country, `59` Merchant Name, `60` Merchant City, `62` Additional Data (template), `84` RAAST RTP Template (DQRC only, embeds the RTP correlation id), `63` CRC. CRC-16/CCITT-FALSE (poly `0x1021`, init `0xFFFF`) is computed over everything plus a synthetic `6304` header, rendered as 4 uppercase hex digits.

#### `POST /api/v2/qr/sqrc` — Generate SQRC (TSD 3.2)

Generates a **Static QR** — reusable across many payments (multi-use when no amount is supplied).

**Request** (`SqrcRequest`):

| Field | Type | Required | Notes |
|---|---|---|---|
| merchantDetails.merchantId | string | Yes | |
| merchantDetails.tillCode | string | Yes | |
| paymentDetails.amount | string | No | omit for a multi-use QR |
| paymentDetails.currency | string | Conditional | required if amount present |
| transactionInfo.stan / .rrn | string | No | server-generates if omitted |
| billDetails.billNumber / .dueDate / .amountAfterDueDate | string | No | optional bill-backed QR |

```json
{
  "merchantDetails": { "merchantId": "070425271300379", "tillCode": "03791001" },
  "paymentDetails": { "amount": "300.0", "currency": "PKR" },
  "transactionInfo": { "stan": "123123", "rrn": "456456123123", "referenceId": "123456789" },
  "billDetails": { "billNumber": "INV12345", "dueDate": "2025-07-31", "amountAfterDueDate": "320.0" }
}
```

**Response (200):** returns `stan`, `rrn`, `qrString` (full TLV payload), `merchantId`, `tillCode`, and `qrImage` (base64 PNG, 300×300).

```json
{
  "response_code": "00", "response_desc": "SUCCESS",
  "info": { "stan": "123123", "rrn": "456456123123", "qrString": "000201011128480014PK.RAAST.P2M...6304A1B2", "merchantId": "070425271300379", "tillCode": "03791001", "qrImage": "iVBORw0KGgoAAAANS..." }
}
```

**Business notes:** SQRC is multi-use with **no cap** on how many times it can be paid; no expiry is tracked. No RRN uniqueness check — same RRN can be submitted twice.

**Errors:** 119 Invalid request params (400) · 130 (500) · 503 (502, live only)

#### `POST /api/v2/qr/dqrc` — Generate DQRC (TSD 3.8)

Generates a **Dynamic QR** — single-use, fixed-amount, time-bound, embeds an RTP correlation id.

**Request** (`DqrcRequest`): `merchantDetails` (required), `paymentDetails.amount` + `.currency` (required for a fixed-amount QR), `transactionInfo.transactionExpiryDateTime` (ISO-8601, stored as expiry).

```json
{
  "merchantDetails": { "merchantId": "920006301429701", "tillCode": "920011077" },
  "paymentDetails": { "amount": 100.00, "currency": "pkr" },
  "transactionInfo": { "stan": "136693", "rrn": "000619351847", "transactionExpiryDateTime": "2026-06-01T00:55:20" }
}
```

**Response (200):** `stan`, `rrn`, `qrString`, `merchantId`, `tillCode` — **no `qrImage` field** (unlike SQRC).

**Business notes — key state machine behavior:**

- **One-time-use enforced:** a DQRC that has already been paid (via the sandbox scan-and-pay helper) is rejected on a second attempt with code `209` — "DQRC already used."
- Expiry is *recorded* on generation but not yet actively enforced against "now" in this sandbox build.
- The embedded RTP correlation id is inside the QR string only — not returned in the JSON body.

**Errors:** 119 (400) · 130 (500) · 503 (502, live only)

#### `GET /api/v2/attributes` — RAAST-QR Attributes (TSD 3.22)

Returns onboarding-form metadata (field name, data type, required flag, step grouping) for rendering a merchant registration form.

**Query param:** `productCode` (optional, default `RAAST-QR`)

**Response (200)** uses the camelCase envelope and returns a static, versioned list of attribute definitions grouped by onboarding step — safe to cache client-side.

**Errors:** 130 (500) only — this endpoint never rejects a request.

#### `POST /api/v2/merchant/generateInstantMerchantQR` — Generate Instant Merchant QR (TSD 3.26)

Accepts a merchant-uploaded QR artwork/attachment plus contact metadata (`multipart/form-data`: `attachment`, `sourceMid`, `emailValuesMap`). In a live system, dispatches the QR to the merchant by email/SFTP; the sandbox simply acknowledges receipt.

**Errors:** 130 (500) only in the sandbox path.

### 6.3 Payment Domain (7 endpoints)

#### `POST /paymentNotification` — Payment Notification Callback (TSD 3.4)

Inbound callback the RAAST switch/aggregator POSTs once a P2M payment settles.

**Request:** `transactionInfo` (rrn, stan, messageId, referenceId, billNumber), `merchantDetails` (merchantId, tillCode), `paymentDetails` (currency, transactionAmount, netAmount, feeAmount), `senderInfo` (iban, accountTitle).

**Response (200):**

```json
{ "responseCode": "00", "responseDesc": "SUCCESS", "info": { "stan": "010123", "rrn": "010123010123", "merchantId": "MERCH1234", "tillCode": "00000001", "referenceId": "12345678" } }
```

**Business notes:** inserts a new settled (PAID) transaction row on every call — no idempotency/dedup on repeated RRNs. Becomes visible via Transaction Summary once persisted.

**Errors:** 119 (400) · 130 (500) · 503 (502, live only)

#### `POST /api/v2/transactionList` — Transaction Summary (TSD 3.6)

Paginated transaction listing for a merchant within a date range.

**Request:** `fromDate`, `toDate` (`yyyy-MM-dd`, required), `mid` (required), `page`, `pageSize` (required), `tillCode` (optional filter).

**Response (200):** paginated row list — `mid`, `tid`, `rrn`, `netAmount`, `transactionAmount`, `stan`, `settledStatus`, `transactionDateTime` — plus `totalRecords`/`total_pages`/`currentPage`.

**Business notes:** an unknown `mid` simply returns an empty list with `response_code: 00`, not an error.

**Errors:** 119 (400) · 130 (500, e.g. bad date format) · 503 (502, live only)

#### `POST /notifyMerchant` — Notify Merchant (TSD 3.10)

Notifies a merchant/aggregator of an RTP outcome: "RTP Accepted" / "RTP Rejected" / "RTP Expired" / "RTP Processing".

**Business notes:** this exact shape is what the gateway itself fires outbound whenever an RTP resolves (see §6.3 sandbox helpers below) — a partner's registered receiver for this callback is the production-grade way to learn RTP/onboarding outcomes without polling.

**Errors:** 119 (400) · 130 (500) · 503 (502, live only)

#### Sandbox-only payment helpers (not in the TSD, useful for integration testing)

| Endpoint | Purpose |
|---|---|
| `POST /mock-merchant-callback/notifyMerchant` | Stand-in "merchant system" receiver for the outbound Notify Merchant callback — a logging sink so the sandbox is self-contained without a real external merchant server. |
| `POST /mock-merchant-callback/paymentNotification` | Same, for the outbound Payment Notification callback. |
| `POST /sandbox/simulate/scanAndPay?rrn=...&amount=...` | Simulates a customer scanning and paying a previously generated SQRC/DQRC — records a settled transaction and fires the real outbound Payment Notification callback, so a demo can drive an end-to-end flow with no real bank switch. Enforces DQRC one-time-use (209) and multi-use-QR amount requirement (164). |
| `GET /sandbox/qrRecords` | Lists every QR generated in this sandbox instance — used to pick a valid `rrn` for `scanAndPay`. |

**MDR fee model (sandbox default):** `fee = round(amount × 0.001, 2dp)`, `net = round(amount − fee, 2dp)` — flat 0.1%, not yet wired to a merchant's configured MDR profile.

### 6.4 Merchant Domain (8 endpoints)

All operate on the merchant record created by the Onboarding domain. Unknown `merchantId` → code `62` "Merchant not found" on every read/mutate call.

| # | Endpoint | Purpose |
|---|---|---|
| 1 | `POST /api/v2/merchants/onboardingStatus` (TSD 3.12) | Merchant status + CAS-registration lifecycle by MID. |
| 2 | `GET /api/v2/merchants/?type={MID\|IBAN\|CNIC}&value=...` (TSD 3.13) | Full merchant profile lookup by MID, IBAN, or CNIC — may return multiple matches. |
| 3 | `POST /api/v2/merchants/updateMerchantStatus` (TSD 3.14) | Activate/deactivate a merchant with an audit reason. |
| 4 | `GET /api/v2/merchants/unregisterMerchant?merchantId=...` (TSD 3.15) | Permanently de-register (soft-delete) a merchant from RAAST-CAS. |
| 5 | `POST /api/v2/merchants/updateMerchantProfile` (TSD 3.16) | Partial ("PATCH"-style) update of merchant profile fields — only supplied fields change. |
| 6 | `GET /api/v2/merchant/getRegistrationParamters` (TSD 3.21) | Reference/lookup data for onboarding forms: MDR profiles, gender, payment channel, legal entity types, city list, MCC list. |
| 7 | `POST /api/v2/merchant/getDocuments/{legalEntityValue}/{aggregatorCode}` (TSD 3.27) | Required-document checklist, varying by legal entity type. |
| 8 | `POST /api/v2/merchant/addMerchantAttachment` (TSD 3.28) | Uploads a base64 document, returns an `imageIdentifier` for later reference in onboarding's `attachmentList`. |

**Sample — Update Merchant Profile request:**

```json
{
  "merchantIdentifiers": { "mid": "MERCH1234", "tid": "00000001" },
  "fieldsToUpdate": {
    "merchantInfo": { "merchantName": "John Doe", "shopAddress": "123 Main Street, Block A", "cityCode": "021", "email": "john.doe@abcelectronics.com" },
    "businessInfo": { "expectedRevenue": 500000, "mcc": "5732" },
    "paymentInfo": { "mdrType": "P", "mdrValue": 2.5 }
  }
}
```

**Business notes across the domain:**

- **Merchant lifecycle states:** `casRegisterStatus` moves through `Registered_Active` → `Registered_Inactive` (status update) → `Unregistered` (terminal — no re-registration path in this sandbox).
- **MCC validation:** only `businessInfo.mcc` on Update Profile is checked against the reference MCC list (code `189` if unknown) — most other free-text fields are accepted without referential validation.
- **Document uploads are not persisted** in the sandbox — bytes are discarded, only a sequential in-memory identifier is issued (resets on app restart). This is the clearest "what changes going live" item in this domain.

**Common errors:** `62` Merchant not found (all read/mutate) · `119` Invalid request params · `189` Merchant category code not found · `503` (live only) · `130` generic.

### 6.5 Onboarding Domain (2 endpoints)

Implements a **maker-checker** merchant approval workflow. In the sandbox, the "checker" stage is an unattended timer, not a second human/API call.

#### `POST /api/v2/merchant/submitDraftMerchant` — Merchant Onboarding (TSD 3.23)

The "maker" step. Submits a full `merchantData` payload (name, CNIC, IBAN, business address, legal entity, expected revenue, etc.). Returns a `processId` and a pre-generated `mid` **immediately** — the caller does not block for a decision.

```json
{
  "data": "84213097",
  "responseCode": "00",
  "responseDescription": "Merchant Submitted Successfully"
}
```

**What happens next (automatic):** after a configurable delay (**default 5 seconds**), the sandbox always approves the draft, materializing a real Merchant record immediately visible via the Merchant domain. There is no automatic rejection path in this sandbox build (a live reviewer would have one).

#### `GET /api/v2/payOnboarding/getStatus?processId=...` — Onboarding Process Status (TSD 3.25)

Poll this to check review status:

| Field | Pre-approval | Post-approval |
|---|---|---|
| approved | `false` | `true` |
| merchantMidDTO | `null` | `{"mid": "920007005883400"}` |
| qrEnabled | `false` | `true` |
| rejected | `false` | `false` (never becomes true in the sandbox) |

**Recommended polling cadence:** every 2–3 seconds until `approved` becomes `true`.

**Errors:** `62` Merchant not found (404, unknown processId) · `119` (400) · `130`/`503` generic.

## 7. Complete Response Code Reference

Every domain shares one response-code catalogue (TSD Appendix 4.5). The most frequently seen codes across all endpoints:

| Code | Description | Typical HTTP |
|---|---|---|
| 00 | Processed OK | 200 |
| 44 | Invalid token | 401 |
| 45 | Token expired | 401 |
| 62 | Merchant not found | 404 |
| 111 | Required header not provided | 400 |
| 112 | Token is not valid | 401 |
| 119 | Invalid request params | 400 |
| 130 | Unable to handle HTTP request (generic fallback) | 500 |
| 133 | Merchant QR not found | 404 |
| 159 | File should not be empty or null | 400 |
| 164 / 165 | Transaction amount must be > 0 / not zero | 400 |
| 177 | Authorization header is missing | 401 |
| 178 | Unauthorized action: merchant does not match token | 403 |
| 187 | Merchant already exists (IBAN/DBA/EMAIL) | 409 |
| 189 | Merchant category code not found | 404 |
| 199 / 201 | CNIC / NTN not valid | 400 |
| 205 | Invalid RTP Type | 400 |
| 209 | DQRC already used (sandbox-only addition) | 409 |
| 400 / 401 / 403 / 404 | Standard HTTP semantics | as named |
| 503 | Upstream (live) response null or timed out | 502 |
| 804 | Database error occurred | 500 |

*(The full catalogue is ~90 codes covering every domain, including reserved/aspirational codes for a stricter live implementation — e.g. duplicate-QR detection, bill-payment validations, terminal/aggregator lookups. Full table available on request or in the companion technical appendix.)*

**Error envelope shape (every domain, every endpoint):**

```json
{
  "response_code": "<code>", "response_desc": "<description>",
  "responseCode": "<code>", "responseDescription": "<description>"
}
```

Both casing conventions are always present together — parse whichever your client prefers.

## 8. Reference Data

- **Merchant Category Codes (MCC):** 368 entries (TSD Appendix 4.4), e.g. `5411` Grocery Stores, `5732` Electronics, `0742` Veterinary Services. Validated on Update Merchant Profile.
- **City Codes:** 37 entries (TSD Appendix 4.1), e.g. `021` Karachi, `022` Hyderabad, `042` Lahore.

Both are available via `GET /api/v2/merchant/getRegistrationParamters` as ready-to-render dropdown option lists.

## 9. Configuration & Environment Reference

```yaml
provider:
  auth: mock        # flip to "live" per domain — independently
  qr: mock
  payment: mock
  merchant: mock
  onboarding: mock
  rtp: mock

live:
  auth:      { base-url: "http://<real-auth-service>" }
  qr:        { base-url: "http://<real-qr-service>" }
  payment:   { base-url: "http://<real-payment-service>" }
  merchant:  { base-url: "http://<real-merchant-service>" }
  onboarding:{ base-url: "http://<real-onboarding-service>" }
  rtp:       { base-url: "http://<real-raast-service>" }

sandbox:
  onboarding.auto-approve-delay-ms: 5000
  rtp.now-resolve-delay-ms: 4000
  rtp.later-resolve-delay-ms: 10000
  rtp.now-accept-probability: 0.75
  rtp.later-accept-probability: 0.70
```

Every `provider.<domain>` flag is independently switchable at **runtime**, with no restart, via an admin endpoint — this is the mechanism that lets one partner bank go live on `rtp` while another is still integrating against the sandbox on every domain.

## 10. Partner Integration Guide — Building a Wrapper

The recommended pattern for a partner (or our own internal team) building a wrapper around this API to plug into their own system:

### 10.1 Core wrapper responsibilities

1. **Token lifecycle management** — cache the bearer token from `getToken`, track its 1-hour expiry client-side, and transparently re-fetch a fresh token before it expires (or on receiving a `44`/`45`/`112` code) rather than re-authenticating on every call.
2. **Retry with backoff** — wrap outbound calls in a retry policy for `503` (upstream timeout) and network-level failures only; **never** blindly retry `119` (validation) or `62` (not found) — those need a caller-side fix, not a retry.
3. **DTO mapping layer** — map our request/response field names (which mix snake_case and camelCase per TSD convention, and use dot-notation nested objects like `merchantDetails.merchantId`) onto your own internal domain model *once*, in one place, rather than scattering field-name translation across call sites.
4. **Idempotency at your layer** — several sandbox endpoints (e.g. Payment Notification, SQRC generation) do not enforce uniqueness on `rrn`/`stan` server-side; if your system requires exactly-once semantics, generate and track your own idempotency key before calling us.
5. **Callback receiver** — implement one HTTP endpoint on your side matching the Notify Merchant / Payment Notification shape (§6.3), and register its URL with us, so RTP and payment outcomes reach you by push rather than requiring you to poll.
6. **Central error translation** — since every error carries both `response_code`/`responseCode` regardless of casing, normalize to one internal error shape immediately at the wrapper boundary, and map our numeric codes to your own domain-level exceptions/error types.

### 10.2 Conceptual flow (end-to-end)

```text
1. getToken(aggregatorCode, clientSecret)         → cache token, expiry
2. submitDraftMerchant(merchantData)              → processId, mid
3. poll getStatus(processId) every 2-3s           → until approved=true
4. generateSQRC / generateDQRC(merchantId, ...)   → qrString, qrImage
5. (customer pays — real world, or /sandbox/simulate/scanAndPay in testing)
6. receive Payment Notification callback (push)   → reconcile against your ledger
   — or —
   initiate rtpNow / rtpLater(...)                → rtpId
7. receive Notify Merchant callback (push)         → RTP Accepted / Rejected / Expired
8. transactionList(mid, dateRange)                 → periodic reconciliation
```

### 10.3 Wrapper pattern — Java (Spring RestClient)

```java
public class AcquiringGatewayClient {
    private final RestClient http;
    private volatile String cachedToken;
    private volatile Instant tokenExpiresAt = Instant.EPOCH;

    private synchronized String token() {
        if (Instant.now().isAfter(tokenExpiresAt.minusSeconds(60))) {
            var resp = http.post().uri("/api/v2/getToken")
                .body(Map.of("aggregatorCode", aggregatorCode, "clientSecret", clientSecret))
                .retrieve().body(GetTokenResponse.class);
            cachedToken = resp.data().token();
            tokenExpiresAt = Instant.now().plusSeconds(3600);
        }
        return cachedToken;
    }

    public SqrcResponse generateSqrc(SqrcRequest req) {
        return http.post().uri("/api/v2/qr/sqrc")
            .header("Authorization", "Bearer " + token())
            .body(req)
            .retrieve()
            .onStatus(status -> status.value() == 502, (rq, rs) -> { throw new UpstreamTimeoutException(); })
            .body(SqrcResponse.class);
        // wrap the call site itself in your retry policy (e.g. Resilience4j) for the 502 case
    }
}
```

### 10.4 Wrapper pattern — Python

```python
class AcquiringGatewayClient:
    def __init__(self, base_url, aggregator_code, client_secret):
        self.base_url = base_url
        self.aggregator_code = aggregator_code
        self.client_secret = client_secret
        self._token = None
        self._expires_at = 0

    def _token_valid(self):
        if not self._token or time.time() > self._expires_at - 60:
            resp = requests.post(f"{self.base_url}/api/v2/getToken", json={
                "aggregatorCode": self.aggregator_code,
                "clientSecret": self.client_secret,
            }).json()
            self._token = resp["data"]["token"]
            self._expires_at = time.time() + 3600
        return self._token

    def generate_sqrc(self, payload):
        r = requests.post(f"{self.base_url}/api/v2/qr/sqrc",
                           headers={"Authorization": f"Bearer {self._token_valid()}"},
                           json=payload)
        body = r.json()
        if body.get("response_code") not in ("00",):
            raise AcquiringApiError(body["response_code"], body.get("response_desc"))
        return body["info"]
```

### 10.5 What NOT to hardcode in your wrapper

- **Response code meanings** — keep the code→message mapping in one config table synced against §7, not scattered as string literals across your codebase.
- **The onboarding auto-approve delay** — treat `approved`/`rejected` as the source of truth from polling or callback, not a fixed sleep timer.

## 11. Sandbox Boundary & Roadmap to Going Live

### 11.1 What's simulated today vs. what changes going live

| Element | Today (Sandbox) | What changes going live |
|---|---|---|
| Merchant approval | Manual-approve only (with reject path) | Real maker-checker with a human reviewer decision |
| Database | H2, file-mode, single volume | Postgres/managed RDBMS with real backup and failover |
| Tokens / sessions | Self-signed, sandbox-scoped only | Real signing keys, secret management, TLS-terminated edge |
| Document uploads | Accepted, not persisted | Real file storage + validation |
| CORS | Deliberately open (demo/integration tool) | Locked to partner-bank origins |
| Funds movement | None — no real money ever moves | Governed entirely by which domains are flipped to live |

### 11.2 Roadmap (phases are independent per domain)

- **Phase 00 — Sandbox & governance** *(Complete)* — All endpoints, full portal parameter coverage, admin governance, real maker-checker onboarding pattern (auto-approve today, human-reviewer-ready).
- **Phase 01 — Production hardening** *(Planned)* — Postgres, real secret management, TLS-terminated edge, CORS locked to named partner origins, real document storage.
- **Phase 02 — Multi-bank, multi-rail scale-out** *(Planned)* — Per-partner routing (same domain live for one bank, sandboxed for another), new endpoints from future TSD revisions.
- **Phase 03 — Compliance & operational readiness** *(Planned)* — Formal audit retention, incident runbooks, load/failure-mode testing against real timing.

---

*This is a working draft (v0.1) for internal review. Once the structure and coverage are approved, the full version — with every field-level table, every error code, and complete curl examples for all 28 endpoints — will be finalized as the enterprise-grade partner document (Word/PDF).*
