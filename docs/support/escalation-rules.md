# Escalation Rules — Phase 30

## Escalation Levels

### Level 1: Support/Ops (Self-Resolve)
Actions support can take independently:
- Acknowledge and log user reports
- Create support cases
- Ask users to re-login/refresh for cache issues
- Explain reward formulas, verdict reasoning, feature requirements
- Run read-only queries to investigate
- Communicate known issues and workarounds

### Level 2: Ops/Admin (Requires Admin Access)
Actions requiring admin role:
- Run repair tools (wallet, XP, skills, inventory)
- Grant badges/titles manually
- Update user status (activate/deactivate)
- Grant/revoke premium status
- Toggle kill switches
- Create/update incidents
- Run anomaly detection

**Maximum delay before escalation from L1 → L2**: 15 minutes for P0/P1, 4 hours for P2

### Level 3: Engineering
Actions requiring engineering involvement:
- Code changes / hotfixes
- Database schema changes
- Provider integration fixes
- Complex data repairs not covered by repair tools
- Investigating and fixing bugs
- Rollback decisions

**Maximum delay before escalation from L2 → L3**: Immediate for P0, 15 minutes for P1, next business day for P2/P3

### Level 4: Founder Visibility
Situations requiring founder awareness:
- Any P0 incident
- Economy corruption (reward duplication, wallet drift at scale)
- Data breach or security incident
- System-wide outage lasting > 15 minutes
- Rollback of a major release
- Multiple P1 incidents in 24 hours

**Maximum delay before escalation**: 5 minutes for P0, 30 minutes for other triggers

## Specific Escalation Triggers

| Trigger | Escalation Path | Maximum Delay |
|---------|----------------|---------------|
| P0 incident confirmed | → Engineering + Founder immediately | 0 minutes |
| Reward duplication suspicion | → Engineering immediately | 0 minutes |
| System-wide login failures | → Engineering immediately | 0 minutes |
| Judge failure rate > 5/hour | → Engineering within 15 min | 15 minutes |
| Wallet balance mismatch | → Admin (run repair) → Engineering if repair fails | 15 minutes |
| Missing cosmetic equip (single user) | → Admin (run inventory repair) | 4 hours |
| Progression mismatch after approved proof | → Admin (run repair) → Engineering if not trivial | 30 minutes |
| Store purchase failed (single user) | → Support (explain reason) | 4 hours |
| Store purchase failed (multiple users) | → Engineering | 15 minutes |
| Unfair reject dispute | → Admin (review verdict) → Engineering if pattern | 4 hours |
| Provider outage | → Engineering (monitor fallback) | 15 minutes |
| Release regression | → Engineering → Rollback if P0/P1 | Immediate |

## Required Investigation Notes Before Escalation

Before escalating from any level, the escalator must provide:
1. User ID(s) affected
2. Exact symptom description
3. Category and assigned severity
4. Logs/data already checked (with results)
5. Actions already taken
6. Hypothesis for root cause (if any)
7. Time the issue was first reported

## Release Freeze Rules

Activate release freeze when:
- Any active P0 incident
- Any active P1 with unknown root cause
- Rollback in progress
- Hotfix being deployed
- Multiple P2 incidents that might be related (suspected regression)

Deactivate release freeze when:
- Root cause identified and fixed
- Fix verified in production
- No related incidents in last 30 minutes
