# Stellar Harness

An operator agent for one organisation on Stellar. The organisation tells the harness which accounts, contracts and anchor it runs, and gives it a policy: what it may do and how much it may spend before the owner has to approve. The harness watches those things, notices problems, simulates the fix to get its real cost, and proposes it as an action that is either within policy or needs approval.

## Run it

```bash
pnpm install
cp .env.example .env          # set OPENAI_API_KEY
docker compose up -d postgres
pnpm dev                      # http://localhost:3000
```
