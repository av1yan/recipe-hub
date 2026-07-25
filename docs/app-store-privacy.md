# App Privacy ("nutrition labels") — App Store Connect

Derived from an audit of the actual data flows in the app + backend. recipHub
qualifies for one of the cleanest labels: **no tracking, no ads, no analytics,
no crash-reporting SDKs.** Everything collected is tied to the account and used
only to run the app.

## Data used to track you
**None.** No ad networks, no data brokers, no cross-app linking.

## Data linked to you
Toggle these **7** on. For every one: **Linked = Yes · Used for tracking = No ·
Purpose = App Functionality** (only).

| Apple data type | Source |
|---|---|
| Contact Info → Email Address | Sign-up, Sign in with Apple, password reset |
| Contact Info → Name | Profile / sign-up |
| User Content → Photos or Videos | Recipe photos you save; grocery/recipe scan images |
| User Content → Other User Content | Recipes, meal plans, grocery lists, cookbooks, ratings |
| Identifiers → User ID | Account ID + Apple/Google sign-in ID + RevenueCat user ID |
| Identifiers → Device ID | Collected by the RevenueCat SDK for purchases (IDFV, not ad tracking) |
| Purchases → Purchase History | Subscription status via RevenueCat / the App Store |

## Not collected (answer "No")
- **Health & Fitness / Sensitive Info** — diet prefs, allergies, calorie & macro
  goals are stored **on-device only** (localStorage) and never transmitted.
- **Financial Info** — Apple processes payment; the app never sees card data.
- **Location, Contacts, Browsing/Search History, Usage Data, Diagnostics, Audio**
  — no SDK or code collects any of these. ("Invite friends" uses the share
  sheet, not the contact list.)

## Why these answers hold
- No analytics/ads/crash SDKs in the app (deps: Capacitor plugins, RevenueCat,
  lucide, tesseract.js, React/Vite).
- On-device-only preferences never leave the device → not "collected."
- RevenueCat collects an IDFV (device id) + purchase history for subscriptions —
  default config, no ad attribution → not tracking.

## Sub-processors (for the Privacy Policy, not the label)
The nutrition label doesn't list vendors, but the policy must disclose the
third parties data passes through:
- **Anthropic (Claude)** — processes recipe text + scan/import photos to extract
  recipes and grocery items
- **Resend** — sends password-reset emails
- **RevenueCat** — manages subscriptions
- **Railway** (or current DB host) — hosting/storage
- **Apple / Google** — sign-in

## Photos — judgment call
Marked **Photos or Videos** as *collected* because saved recipes can store an
image and scan images are transmitted to Anthropic for processing. Scan images
aren't persisted (only extracted text is kept), but recipe photos are — so
"collected" is correct either way.
