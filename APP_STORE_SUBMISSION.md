# Focus Cycles Mac App Store Submission

## App record

- **Name:** Focus Cycles
- **Primary category:** Productivity
- **Price:** Free
- **In-app purchases:** None
- **Bundle ID:** `com.bud.focuscycles`
- **Supported Mac:** Apple silicon
- **Age rating:** Complete the App Store Connect questionnaire. The app contains no user-generated public content, gambling, medical content, or unrestricted web access.

## Subtitle

Plan, focus, review, repeat

## Promotional text

A focus timer that helps you decide what matters before the clock starts, then review what worked when the cycle ends.

## Description

A timer can count minutes. Focus Cycles helps you use them well.

Each focus cycle has three simple steps:

1. Plan what you want to accomplish and how you will begin.
2. Focus with your target beside the countdown.
3. Review the result, note distractions, and choose the next action.

Use a one-cycle sprint when you need to start small. Build a longer session when you need deeper work. Presets make common schedules quick to set up, while custom focus and break durations keep the system flexible.

Focus Cycles also includes:

- clear Home, Session, and History navigation
- a horizontal interval progress bar
- a compact floating timer and menu bar countdown
- local focus history with CSV export
- daily goals and plan-versus-result patterns
- local focus sounds
- custom backgrounds and light and dark themes
- keyboard shortcuts for the full session flow
- recovery after a quit, crash, or restart

Your plans, reviews, history, and custom backgrounds stay on your Mac. Focus Cycles has no account, advertising, or analytics.

Focus Cycles is inspired by the Work Cycles framework created by Sebastian Marshall and the Ultraworking team. It is an independent app and is not affiliated with Ultraworking.

## Keywords

focus,timer,productivity,pomodoro,deep work,time management,work cycles,planner,habits

## URLs

- **Support:** https://github.com/budhennekes/focus-cycles/issues
- **Privacy:** Publication pending. Do not enter the previously checked 404 GitHub privacy URL. Publish the current `privacy.html` or `PRIVACY.md` and verify the resulting public HTTPS address.
- **Marketing:** https://github.com/budhennekes/focus-cycles

## App privacy draft

Confirm these answers in App Store Connect against Apple's current definitions before submission:

- Session plans, reviews, history, and custom backgrounds are not collected by the developer. They stay on the Mac.
- The app has no advertising, analytics, account system, or tracking.
- Weather and IP-location lookup are absent from this release. Legacy saved coordinates are not used or transmitted.
- Built-in online backgrounds load from Unsplash. Unsplash receives normal network request data, including the IP address.

Do not select “Data Not Collected” until the Unsplash behavior has been checked against Apple's current App Privacy definitions.

## Screenshot set

Use the current `docs/store-assets-navigation/` captures. Delivery copies are RGB PNG, 1440×900, without alpha. These replace earlier weather-enabled or circular-progress images.

1. `01-work-cycles.png` — Home, daily intent, quote, cycles and durations.
2. `02-plan.png` — Plan the next action.
3. `03-focus.png` — Horizontal interval progress and Session navigation.
4. `04-review.png` — Review after Skip, without claiming productive completion.
5. `05-dark-mode.png` — Home in dark mode.

Screenshots use fictional sample text, not user or client records.

## Review notes draft

Focus Cycles does not require an account or network connection for its core timer, session, history, sound, and export features.

Suggested review path:

1. Choose the Start small preset.
2. Select Start focusing.
3. Complete or skip the planning prompt.
4. Use the timer controls or Skip to reach the review prompt.
5. Open History to inspect local session data and CSV export.

Weather is not included. The app makes no weather or IP-geolocation requests.

The app has no purchases, subscriptions, sign-in, tracking, or hidden features.

## Submission blockers on this Mac

- A valid Mac App Distribution signing identity is installed. No valid Mac Installer Distribution identity was listed by the latest keychain check.
- No Mac App Store provisioning profile is installed in either standard provisioning-profile directory.
- Signing environment values are not configured, and no signed `dist-mas/Focus-Cycles.pkg` exists.
- The bundle ID must match the App Store Connect app record and provisioning profile.

After Apple credentials are installed, run:

```bash
npm run audit:release
npm run package-mas
```

Then upload `dist-mas/Focus-Cycles.pkg` with Transporter and complete the App Privacy, age rating, export compliance, content rights, and regional compliance sections in App Store Connect.
