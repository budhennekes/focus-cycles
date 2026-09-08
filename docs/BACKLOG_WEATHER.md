# Deferred feature: optional weather

## Decision
Bud approved removing weather from the first Store release to avoid delaying submission. Revisit after launch; do not add a provider during release freeze. Keep the clock and all focus features.

## Free option worth evaluating
National Weather Service API: https://www.weather.gov/documentation/services-web-API . Official documentation checked September 7, 2026 states that its data is open and free for any purpose and that service has no usage fees. It has reasonable unpublished rate limits and requires an identifying User-Agent. Documentation warns authentication may change in future.

It supplies forecasts/observations through NWS office grids, not a verified worldwide drop-in replacement. Evaluate supported geography, station observation freshness, Electron request headers/CORS, availability, attribution and privacy before integrating. Consider manual city selection rather than automatic IP geolocation. No integration or live location request was made during this research.

The previous Open-Meteo free endpoint has a non-commercial-use condition; free app pricing alone does not establish eligibility. The former implementation also used ipwho.is/ipapi.co, adding third-party location requests and disclosures.

## Reintroduction acceptance criteria
- Explicit approval after the initial release.
- Free use permitted for the actual app/distribution model; no hidden paid plan.
- No embedded secret or new account required without approval.
- Optional, off by default, with a clear disable action.
- No automatic IP location lookup by default.
- Cache and rate-limit politely; bounded timeout and clean offline/unavailable state.
- Update privacy policy, manifests as applicable, and Store disclosures/screenshots before shipping.
- Native QA against fresh and upgraded isolated profiles; confirm no requests when disabled.

## Removal scope
Remove weather control, provider code, refresh timer and provider CSP permissions. Leave prior saved settings/history intact; legacy weather coordinates, if present, are inert local data and are not used or transmitted. Preserve pre-removal build artifacts. Online Unsplash scenery remains a separate network/privacy consideration.
