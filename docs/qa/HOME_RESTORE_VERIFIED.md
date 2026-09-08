# Home restoration — verified

Restored index.html from /tmp/focus-simple-before.html after rejection of the task-first simplification. The sole retained difference is the independent background fallback fix: failed photo requests no longer overwrite the saved scene selection. All earlier onboarding, scenic defaults, bounded loading, reduced-motion, copy, recovery and save fixes remain in the baseline.

Restored onboarding test expectations to intentInput. Archived the rejected source, native direct-start verifier and obsolete SIMPLE_FLOW_VERIFIED.md outside the repository at /Users/budhennekes/Documents/Focus Cycles Previews/focus-rejected-a_orcd3c. Removed the two experiment-only files from the active project. No Git reset or commit; unrelated dirty files retained.

Verification:
- Release audit: passed; 104 assertions, zero failures, zero known dependency vulnerabilities.
- Native offline and online onboarding: passed.
- Native reliability verifier: passed.
- Inspected restored scenic setup screenshot: /tmp/focus-onboarding-e3esv0/setup.png.
- Direct preview and unsigned MAS package verification passed; both bundled index.html files match restored source.
- git diff --check passed.

Restored preview: /Users/budhennekes/Documents/Focus Cycles Previews/restored-PFAZUH/Focus Cycles-darwin-arm64/Focus Cycles.app
Uses separate Test Profile. Existing app histories were not touched.

Release status: not submitted. Signed packaging stops at unset MAS_APP_IDENTITY. A valid Mac App Distribution identity is present. Installer identity and provisioning configuration still need resolution. Store privacy answers, listing and upload remain release checkpoints. Freeze further redesign work.
