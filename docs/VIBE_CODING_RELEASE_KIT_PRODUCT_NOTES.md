# Vibe Coding Release Kit: Product Notes

## Verdict

Do not build another app yet. First use the Focus Cycles release to create a proven, beginner-safe release kit. Sell the documented system before turning it into software.

## Problem

AI can help a first-time builder create an app quickly. It does not make signing, privacy, packaging, testing, store metadata, certificates, provisioning, or review understandable.

The customer is not blocked by code. The customer is blocked by an unfamiliar release system and fear of making an irreversible mistake.

## First customer

A nontechnical or lightly technical person who:

- built a desktop or mobile app with AI;
- has never shipped through an app store;
- is confused by certificates and provisioning;
- does not know which AI-generated claims are safe to trust;
- needs a clear next action and a way to verify it.

## Best first product

**Ship Your First Mac App**

A guided SOP and template kit for taking an AI-built Electron app from a local project to a tested Mac App Store submission.

This should begin as a digital product, not SaaS.

## Promise

Turn an AI-built Mac app into a verifiable App Store submission without guessing which certificate, profile, entitlement, build, or metadata field comes next.

Do not promise approval. Apple controls review outcomes.

## MVP contents

1. Beginner release map
2. One-checkpoint-at-a-time Mac App Store SOP
3. Certificate and provisioning decision guide
4. App identity worksheet
5. Privacy and network-request audit worksheet
6. Preflight code-review prompt
7. Signing and package verification commands
8. TestFlight test script
9. Store-listing metadata template
10. App Review notes template
11. Rejection-response worksheet
12. Error log template

## Differentiator

Most guides explain Apple’s system from Apple’s point of view. This kit starts with the first-time AI builder’s actual state:

- a working local app;
- uncertain code quality;
- no release vocabulary;
- many AI-generated files;
- no confidence that the build is safe or reproducible.

The value is not more information. The value is sequencing, plain language, verification, and stop conditions.

## Product ladder

### Version 1: template kit

- Format: PDF or web guide plus Markdown/Notion templates
- Suggested validation price: $19 to $39
- Goal: prove that people will pay for the sequence and checklists

### Version 2: guided cohort or service

- Small paid session or release clinic
- Customer brings one app
- Work through identity, preflight, signing, TestFlight, and submission
- Use recurring questions to improve the kit

### Version 3: software only if demand is proven

Possible features:

- Local project scanner
- Bundle-ID and version checks
- Entitlement review
- Privacy-claim mismatch detection
- Release-readiness checklist
- Safe command generation
- Artifact verification report

The tool should remain local-first and should never collect private keys or signing passwords.

## Validation plan

Use Focus Cycles as case study number one.

During the release, capture:

- every point of confusion;
- every wrong turn;
- every term that needed translation;
- screenshots with private details removed;
- exact verification commands;
- Apple errors and their confirmed fixes;
- time spent at each phase.

After Focus Cycles ships:

1. Give the kit to three first-time builders.
2. Watch where they stop or ask questions.
3. Fix the SOP before adding more content.
4. Charge for the next small group.
5. Build software only if the same checks repeat across projects.

## Safety boundaries

- Never request or store a user’s private signing key.
- Never ask users to paste passwords or app-specific passwords into the product.
- Keep certificates and provisioning profiles local.
- Treat App Store approval as uncertain.
- Separate official Apple requirements from practical recommendations.
- Update the kit when Apple changes terminology or requirements.

## Immediate next action

Finish Focus Cycles using `MAC_APP_STORE_FIRST_RELEASE_SOP.md`. Add lessons to this product outline only after each lesson is verified during the real release.
