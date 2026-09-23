# Release plan

Confirmed costs only: Apple Developer Program ($99/year) and Google Play ($25 once). Stop before any other paid service.

- Bundle id and package name: `com.ajeenckya.pact`. Confirm before creating the store records.
- Web stays on GitHub Pages until a free Cloudflare Pages project is verified.
- The Worker deploys with Wrangler on the Cloudflare free plan. It stores ciphertext only.
- Phone builds use local Expo builds when the free EAS quota (15 iOS and 15 Android cloud builds a month) is spent.
- After the Apple account exists: TestFlight internal, then external.
- After the Play account exists: internal track, then a closed test with at least 12 opted-in testers for 14 days, then a staged production rollout at 10%, 25%, 50%, and 100%.
- Production starts only when crash-free sessions are at least 99.8% and no P0 bug is open.
- Tester mix to recruit: Apple Watch, WHOOP or Garmin, Oura, and Samsung Health.
- Store privacy label and Data safety: health data stays on the device; partner messages are end-to-end encrypted; no tracking SDKs.
