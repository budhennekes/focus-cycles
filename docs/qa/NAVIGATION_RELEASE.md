# Local navigation release candidate

Implemented: Home/Session/History navigation, labeled keyboard-reachable Settings, horizontal interval progress, and an in-progress Home return card. Navigation reveals existing prompt DOM; it does not recreate the plan/review. Start is guarded against replacing an unfinished session. Timer deadlines and paused remaining time survive navigation. Recovery/save-retry retain precedence. Weather remains removed.

Verified: 104 timer assertions; source smoke and release audit; native navigation/draft/pause/save-retry checks; Settings focus and Escape return; 1000/760/480px layouts with reachable narrow Start; existing Compact/onboarding/quotes/media/DST/recovery checks; performance checks; direct and unsigned MAS verification; actual packaged executable launch; final Store captures from packaged source. Tests use isolated profiles, not real user data.

Final photos: docs/store-assets-navigation (repository-relative). Earlier screenshot kits are superseded. Production source and packaged runtime matching are checked before delivery. No commit or public publication is authorized or performed.

Known external gates: public privacy URL (old URL 404), Unsplash App Privacy interpretation, missing installer distribution identity and provisioning profile, user-operated signed build acceptance/upload/submission. Valid app distribution identity is present; support URL returned 200. This is not a signed upload package or an App Review approval.

Evidence: navigation-full.log, navigation-package.log, navigation-release-final.log. Feature freeze begins here.
