---
name: BETA_LEARNINGS
description: Consolidated, decision-relevant learnings from real beta usage — hypothesis, evidence, confidence, decision, status. Not a raw feed of every comment or event; see the feedback table and analytics for that.
---

# TestPass beta learnings

This file holds *conclusions*, not raw data. The three-level model this project uses:

1. **Raw events** — what people actually did (the `events` table: `session_created`,
   `seller_opened`, `seller_submitted`, `paywall_viewed`, `checkout_started`,
   `payment_completed`, `error`, etc.)
2. **Raw feedback** — what people actually said (the `feedback` table: seller/buyer
   micro-ratings, free-text answers, report-a-problem submissions)
3. **Learning** — what the evidence across both actually suggests, once there's enough of it
   to mean something

Decisions in this project come from Level 3. A single polite compliment or a single annoyed
comment is Level 2 and doesn't belong here yet — log it, watch for a pattern, promote it once
one exists.

## Log format

Add one entry per learning, most recent first:

```
### <short title>
- Hypothesis / problem: <what we thought might be true>
- Evidence: <what actually happened — funnel numbers, feedback quotes, repeat count>
- Independent users: <how many separate people this is based on>
- Funnel stage(s) it touches: <e.g. paywall_viewed → checkout_started>
- Category: <if category-specific>
- Confidence: low / medium / high
- Decision: <what we did or decided not to do>
- Status: open / shipped / watching / rejected
```

## Entries

_(No genuine-cohort entries yet — this file is created at launch, before real usage exists. The
first entries should come from actual buyer/seller behavior and feedback, not from
pre-launch speculation. Physical-QA cohort findings about device/browser compatibility are
useful too, but should be labeled `cohort: physical_qa` and kept separate from
willingness-to-pay conclusions — see Section 19 of the beta operating directive.)_
