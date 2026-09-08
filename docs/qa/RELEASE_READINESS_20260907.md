# Focus Cycles — release decisions still required

Checked September 7, 2026. This is a technical evidence sheet, not completed legal declarations.

## Public pages
The app now opens bundled privacy.html and support.html offline. The Store still requires public HTTPS URLs. Publication approval was requested but no affirmative response was received. Nothing was published and no private source repository was exposed.

## Third-party requests
- index.html CSP permits image requests to images.unsplash.com and weather requests to api.open-meteo.com, ipwho.is and ipapi.co.
- Built-in scenery loads online by default. Unsplash receives network request information. Its policy describes IP/device/location information: https://unsplash.com/privacy . Its general photo license permits commercial/non-commercial use but does not settle every asset's attribution or other rights: https://unsplash.com/license .
- Weather starts after opt-in. IP lookup returns coordinates; they are saved locally and sent to Open-Meteo. No GPS permission is requested. IP-derived coordinates are not proof of a particular user's precise physical location.
- ipwhois.io describes automatic usage/IP logs and retention tied to purposes: https://ipwhois.io/privacy .
- ipapi says queries are stored in logs for a limited time: https://ipapi.co/privacy/ .
- Open-Meteo describes IP/URL logging and different service terms: https://open-meteo.com/en/terms . The free endpoint is restricted to non-commercial use. Free app pricing alone does not establish eligibility. Attribution has been added to the bundled policy/support documents. Confirm permission/eligibility or approve an alternative before shipping; do not embed a paid secret in the client.
- Apple defines collection by off-device retention beyond servicing a request, not merely whether the developer has an account database. Provider logs mean blanket Data Not Collected is not justified by this source audit: https://developer.apple.com/app-store/app-privacy-details/ . Final purpose, linkage and tracking responses require matching the provider practices to this integration.

## Apple-controlled gates
User must handle identities/provisioning, account access, agreements, legal declarations, Transporter, TestFlight and final submission/release. No signed installer was produced. Unsigned MAS structure passing is not signed sandbox acceptance. Manifest/required-reason API declarations must be checked against the final signed candidate and applicable Apple requirements, not populated with guessed values.

## Local verification
- npm run audit:release passed; zero known vulnerabilities; 104 timer assertions and eight Node test cases passed.
- npm run verify:native passed all constituent checks. The following chained packaged-launch command initially failed only because its checker compared a relative input path to an absolute file URL. The checker now resolves the input path; rerun passed.
- Both npm packaging commands and package verifiers passed. Source-matched offline Help windows were opened through actual native menu items against packaged code.
- Actual packaged executable launched using isolated userData and zero initial history.
- Five actual rendered screenshots were visually reviewed and converted to opaque RGB PNG, 1440x900; exact delivery count/dimensions/mode verified.
- MAS executable reports macOS minimum 12.0 and SDK 26.2. Physical older-OS and signed TestFlight acceptance remain untested.
- No Apple account access, certificate changes, commits, pushes or public web publication occurred.

Current candidate: project dist/Focus Cycles-darwin-arm64/Focus Cycles.app. Store structure: dist-mas/Focus Cycles-mas-arm64/Focus Cycles.app. Neither is a completed signed upload package.
