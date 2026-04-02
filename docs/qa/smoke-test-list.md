# Smoke Test List

Minimum viable test pass before any deploy. If any of these fail, the build is broken. Run in order.

| # | Test | Route | Method | Expected | Blocker? |
|---|------|-------|--------|----------|----------|
| S1 | Health check responds | `/api/health` | GET | 200 | YES |
| S2 | Register new user | `/api/auth/register` | POST | 201 with token | YES |
| S3 | Login with new user | `/api/auth/login` | POST | 200 with token | YES |
| S4 | Auth token works | `/api/auth/me` | GET | 200 with user | YES |
| S5 | Create mission | `/api/missions` | POST | 201 with mission object | YES |
| S6 | Start focus session | `/api/sessions/start` | POST | 201 with active session | YES |
| S7 | Stop session (completed) | `/api/sessions/:id/stop` | POST | 200 with completed status | YES |
| S8 | Submit proof with text | `/api/proofs` | POST | 201 with reviewing status | YES |
| S9 | Get reward balance | `/api/rewards/balance` | GET | 200 with balance object | YES |
| S10 | Get car catalog | `/api/cars` | GET | 200 with catalog array | NO |
| S11 | Get character status | `/api/character/status` | GET | 200 with dimensions + visualState | NO |
| S12 | Get room state | `/api/world/room` | GET | 200 with slots + roomState | NO |
| S13 | Logout | `/api/auth/logout` | POST | 200, token invalidated | YES |
| S14 | Rejected after logout | `/api/auth/me` | GET | 401 | YES |

## Run Time

Target: under 2 minutes for all 14 tests manually via curl/Postman.

## Failure Protocol

- S1-S9 failure = **hard block** — do not deploy
- S10-S12 failure = **soft block** — deploy only if failure is isolated cosmetic surface
- S13-S14 failure = **hard block** — auth lifecycle broken
