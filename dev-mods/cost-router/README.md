# cost-router

- Status line (`$.ui.status`): `5h NN% | ctx NN%`, updated on `session.measure`.
- Toasts once each when the five_hour rate-limit window passes 70% and 85%.
- `tool.call` on `Agent`: if no `model` is set, picks haiku/sonnet/opus from description+prompt keywords (`hooks/route.ts`, `pickTier`). Explicit models are never overridden; no keyword match leaves it unchanged. Opus keywords win over sonnet over haiku.

Degradation: `rateLimits` is empty off a subscription or before the first reading, and `context.percent` is absent until the first response (and after /compact). Missing values show as `n/a` and no usage toasts fire.
Toast "once" state is per module load (resets on reload or restart).
