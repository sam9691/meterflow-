# dev notes

scratch pad for things I want to remember / fix later

## things that work but could be better

- the gateway rate limiter cache (`limiterCache` Map) grows forever. fine for now since
  keys don't change often but should add a TTL or use an LRU cache if this gets big

- invoice numbers are generated with a count query which has a race condition under load.
  doesn't matter at this scale but would need a proper sequence if this ever gets concurrent writes

- the billing cron job processes all users sequentially. should batch them or use a queue
  worker pool when user count grows

- refresh token list per user is stored as an array in the user doc. works fine but
  if someone has 100 active sessions this gets messy. probably fine for now

## things i want to add

- email verification on signup (the token generation is already there, just need nodemailer wired up)
- forgot password flow (same - token exists, just need the email sending part)
- api versioning support in the gateway (right now it just forwards everything)
- usage alerts via email not just webhooks
- export usage data as CSV
- team/org support so multiple people can manage the same APIs

## bugs i know about

- the `errors` field name in UsageLog schema triggers a mongoose warning because
  `errors` is a reserved path. works fine but the warning is annoying. renamed it
  to `errorMessage` in the schema but the warning still shows sometimes

- on the billing page, if stripe isn't configured the checkout button throws a 500
  instead of a nice error message. need to add a check for STRIPE_SECRET_KEY before
  trying to create a session

## decisions i made and why

**why two hashes for API keys (SHA-256 + bcrypt)?**
bcrypt is too slow for a lookup on every gateway request (that's the whole point of it being slow).
so SHA-256 is used for the index/lookup (fast), bcrypt is used for verification (secure).
the raw key is never stored anywhere.

**why not use passport.js?**
overkill for what this needs. jwt + manual middleware is simpler and easier to understand.

**why BullMQ instead of just a cron job?**
cron jobs are fine for the monthly billing trigger but BullMQ gives you retry logic,
job history, and the ability to process jobs across multiple workers if needed.
also easier to test individual jobs.

**why repository pattern?**
keeps the controllers thin and makes it easy to swap out the data layer later.
also makes testing easier since you can mock the repository.
