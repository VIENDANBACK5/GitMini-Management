## Summary

- 

## Changed areas

- [ ] Database / SQL
- [ ] Backend API
- [ ] Frontend UI
- [ ] Documentation
- [ ] Operations / Docker / scripts

## Test plan

- [ ] `docker compose build app`
- [ ] `docker compose up -d db app`
- [ ] Health check: `http://localhost:8099/health`
- [ ] Manual UI check at `http://localhost:8099/`
- [ ] Relevant SQL/API/query tested

## Database impact

- [ ] No database change
- [ ] Schema/index/trigger changed and docs updated
- [ ] Seed/benchmark data changed and docs updated

## Documentation impact

- [ ] No documentation change needed
- [ ] README/docs updated
- [ ] Screenshot/report evidence updated

## Checklist

- [ ] Scope is limited to the task
- [ ] No generated data committed (`postgres_data/`, `frontend/dist/`, `node_modules/`)
- [ ] No secrets or local credentials committed
- [ ] Reviewer can reproduce the change from the test plan
