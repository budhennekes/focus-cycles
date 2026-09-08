# First Mac App Store Release SOP

Use this SOP to publish an Electron app through the Mac App Store. Complete one checkpoint at a time. Do not try to hold the full process in your head.

## Operating rule

At each checkpoint:

1. Complete the one action.
2. Save the file or record Apple creates.
3. Run the verification command.
4. Do not continue if verification fails.

Never put certificates, passwords, private keys, provisioning profiles, or API keys in Git.

## Focus Cycles release identity

- Product name: Focus Cycles
- Bundle ID: `com.bud.focuscycles`
- Category: Productivity
- Current version: `1.4.0`
- Current architecture: Apple silicon (`arm64`)
- Project: `~/Documents/Projects/Apps/pomodoro-app`

## Current checkpoint

Latest local candidate: Home/Session/History navigation, horizontal interval progress, weather removed. Use `docs/store-assets-navigation/`, not older screenshots. Local checks and direct/unsigned-MAS packaging pass. No signed Store package or Apple submission is claimed.

Apple account actions below are performed by Bud only. Do not send passwords, verification codes, private keys or account screenshots containing secrets to an assistant. Reuse existing valid identifiers and certificates; do not create duplicates or revoke anything just to follow this guide.

Public privacy hosting remains a separate approval gate. The old GitHub privacy URL returned 404; the support issues URL returned 200 in the latest check.


- [x] Full Xcode installed and selected
- [ ] Paid Apple Developer membership and correct team confirmed by Bud (Xcode account login is optional for this packaging path)
- [ ] Explicit App ID confirmed for `com.bud.focuscycles`
- [x] Current Apple WWDR G3 intermediate certificate installed
- [x] Mac App Distribution certificate trusted
- [ ] Mac Installer Distribution certificate created and trusted
- [ ] App Store Connect macOS record created
- [ ] Mac App Store Connect provisioning profile installed
- [x] Local change review and automated/native/package checks complete
- [ ] Signed `.pkg` built and verified
- [ ] Build uploaded through Transporter
- [ ] TestFlight build installed and tested
- [ ] Store listing and privacy answers complete
- [ ] Submitted to App Review
- [ ] Manually released after approval

## Phase 1: Prepare the Mac

### 1. Install and select Xcode

Install Xcode from the Mac App Store. Open it once and allow it to install components.

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
xcodebuild -version
```

Pass condition: Xcode prints its version without an error.

### 2. Connect the developer account

Bud: confirm the paid membership and correct team in Apple Developer. For this Electron packaging workflow, signing into Xcode is not required if the needed identities and profile are installed. Do not add accounts or change account settings merely to satisfy this step.

Pass condition: Bud confirms the correct active team; no assistant operates the account.

## Phase 2: Establish the Apple identity

### 3. Register the explicit App ID

Open https://developer.apple.com/account/resources

First look for the exact existing identifier. Reuse it if correct. Only if it does not exist, go to Identifiers → + → App IDs → App.

Use:

- Description: Focus Cycles
- Type: Explicit
- Bundle ID: `com.bud.focuscycles`

Enable only capabilities the app uses.

Pass condition: the identifier appears in the Apple Developer portal with the exact bundle ID.

### 4. Install Apple’s current intermediate certificate

Open https://www.apple.com/certificateauthority/

The required intermediate was already installed in the earlier local pass. If the existing identity validates, skip this step. If a trust error occurs, use Apple’s certificate authority guidance for that exact certificate chain. Do not select Always Trust or replace global trust settings.

Pass condition: Apple distribution certificates do not show a red trust warning in Keychain Access.

### 5. Create the Mac App Distribution certificate

A valid app distribution identity is already installed. Reuse it unless Apple shows it is unsuitable. Only if an identity is missing: in Keychain Access, use Certificate Assistant → Request a Certificate From a Certificate Authority. Save the certificate-signing request to disk.

In the Apple Developer portal, go to Certificates → + → Mac App Distribution. Upload the request. Download the certificate and double-click it.

### 6. Create the Mac Installer Distribution certificate

Repeat the previous process, but select Mac Installer Distribution.

Verify both:

```bash
security find-identity -v -p codesigning
security find-identity -v
```

Pass condition: both required identities are valid and have matching private keys. The installer identity may not appear under the codesigning-only policy; inspect the all-policy output too. Use the exact identity names during packaging.

Do not use Developer ID Application or Developer ID Installer. Those are for distribution outside the Mac App Store.

## Phase 3: Create the Apple records

### 7. Create the App Store Connect record

Open https://appstoreconnect.apple.com/

First check for an existing Focus Cycles record. Reuse it if it belongs to the correct team and bundle ID. Only if absent, go to Apps → + → New App.

Use:

- Platform: macOS
- Name: Focus Cycles
- Primary language: English (U.S.)
- Bundle ID: `com.bud.focuscycles`
- SKU: `focus-cycles-mac` (for a new record only; preserve an existing SKU)
- User access: Full Access

Pass condition: Focus Cycles appears with status Prepare for Submission.

### 8. Create the provisioning profile

In the Apple Developer portal, go to Profiles → +.

Select:

- Distribution type: Mac App Store Connect
- App ID: `com.bud.focuscycles`
- Certificate: the Mac App Distribution certificate
- Name: Focus Cycles Mac App Store

Generate and download the profile. Keep the downloaded `.provisionprofile` outside the repository.

Pass condition: the profile references the exact bundle ID and current distribution certificate.

## Phase 4: Prepare the release candidate

### 9. Freeze product changes

Before signing:

- Complete the code review.
- Fix release blockers.
- Confirm the privacy policy matches network behavior.
- Confirm whether this release is Apple silicon only.
- Test a fresh launch and the primary timer flow.

Do not change the code after creating the release candidate. Any change requires a new build and another verification pass.

### 10. Run release checks

```bash
cd ~/Documents/Projects/Apps/pomodoro-app
npm run audit:release
npm run verify:native
npm run package-mas:unsigned
npm run verify:mas
```

Pass condition: all commands exit successfully. Dependencies are already installed; use the existing lockfile. Do not upgrade dependencies during submission. If dependencies must be restored, use `npm ci` and repeat all checks.

## Phase 5: Sign and package

### 11. Set temporary signing values

Use the exact certificate names from `security find-identity`.

```bash
export MAS_APP_IDENTITY='EXACT MAC APP DISTRIBUTION IDENTITY'
export MAS_INSTALLER_IDENTITY='EXACT MAC INSTALLER DISTRIBUTION IDENTITY'
export MAS_PROVISIONING_PROFILE="$HOME/Downloads/Focus_Cycles_Mac_App_Store.provisionprofile"
```

Do not save these values in the repository.

### 12. Build the signed package

```bash
npm run package-mas
```

Expected package:

`dist-mas/Focus-Cycles.pkg`

### 13. Verify the package

```bash
APP='dist-mas/Focus Cycles-mas-arm64/Focus Cycles.app'
PKG='dist-mas/Focus-Cycles.pkg'

codesign --verify --deep --strict --verbose=4 "$APP"
codesign --display --entitlements - "$APP"
pkgutil --check-signature "$PKG"
```

Pass condition:

- No code-signing error
- Valid installer signature
- Bundle ID is `com.bud.focuscycles`
- App Sandbox entitlement is enabled

## Phase 6: Upload and test

### 14. Upload through Transporter

Open Transporter. Sign in. Drag `dist-mas/Focus-Cycles.pkg` into the window and select Deliver.

Pass condition: Transporter reports a successful delivery.

Wait for Apple to process the build. Do not assume upload success means processing success.

### 15. Install through TestFlight

In App Store Connect, open Focus Cycles → TestFlight. Complete beta information and export-compliance questions. Add the processed build to an internal group.

Install that build through TestFlight for Mac.

Test:

- Fresh launch
- Onboarding
- Start, pause, resume, and finish
- Relaunch during an active timer
- History
- CSV export
- Settings persistence
- Custom backgrounds
- Home → Session → History while running and paused, with no reset or lost draft
- Horizontal progress, Compact, native Minimize and return
- Weather is deferred and is not part of this release
- Offline behavior
- Keyboard navigation
- VoiceOver basics

Pass condition: the TestFlight build completes the primary flow without a crash or blocked feature.

## Phase 7: Submit and release

### 16. Complete the listing

Use `APP_STORE_SUBMISSION.md` for current copy and `docs/store-assets-navigation/` for the current five screenshots. Required assets include:

- Name, subtitle, description, and keywords
- Support URL
- Public HTTPS privacy-policy URL
- Category and age rating
- App privacy answers
- Price, tax category, and availability
- One to ten Mac screenshots in an accepted 16:10 size
- Review contact and review notes

Recommended screenshot size: `1440 × 900`.

Privacy answers must match Focus Cycles’ third-party background requests. Weather and IP geolocation are absent. Do not claim that the app makes no network requests.

### 17. Submit for review

Select the processed build. Complete all required fields, encryption/export-compliance answers, content rights, and any regional trader-status requirements. Free pricing alone does not settle legal declarations. Choose manual release. Add the version to the review submission and select Submit for Review.

### 18. Release after approval

After approval, check the listing one final time. Bud selects Release This Version. Apple controls review and processing timing; submitting on the planned day does not guarantee publication that day.

## If something fails

Record four facts before changing anything:

1. Current checkpoint
2. Exact error text
3. Command or screen that produced it
4. Screenshot or log location

Fix one cause at a time. Repeat the checkpoint’s verification before continuing.

## Release evidence to retain

Keep these non-secret records:

- Git commit or tag for the submitted source
- App version and build number
- Final release-check output
- Package verification output
- Transporter delivery result
- TestFlight test checklist
- App Store Connect build number
- Review submission date and outcome

Do not retain passwords, private keys, or raw signing credentials in this file.
