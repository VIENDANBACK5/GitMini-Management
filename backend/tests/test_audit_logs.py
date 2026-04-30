def test_membership_changes_create_audit_logs(client, make_repo, add_member, login, audit_actions):
    make_repo(name="audited-members")
    add_member("audited-members", "bob", "maintainer")

    login("alice")
    update = client.patch("/repos/audited-members/members/bob", json={"role": "developer"})
    remove = client.delete("/repos/audited-members/members/bob")

    assert update.status_code == 200
    assert remove.status_code == 200
    actions = audit_actions()
    assert {"member.add", "member.change", "member.remove"}.issubset(actions)


def test_issue_close_and_reopen_create_audit_logs(client, make_repo, make_issue, login, audit_actions):
    make_repo(name="audited-issues")
    issue = make_issue("audited-issues")

    login("alice")
    close = client.patch(f"/issues/{issue['id']}", json={"status": "closed"})
    reopen = client.patch(f"/issues/{issue['id']}", json={"status": "open"})

    assert close.status_code == 200
    assert reopen.status_code == 200
    actions = audit_actions()
    assert {"issue.close", "issue.reopen"}.issubset(actions)


def test_pr_review_and_merge_create_audit_logs(client, make_repo, add_member, make_pull, login, audit_actions):
    make_repo(name="audited-prs")
    add_member("audited-prs", "carol", "developer")
    add_member("audited-prs", "david", "reviewer")
    pull = make_pull("audited-prs", actor="carol")

    login("david")
    review = client.post(f"/pulls/{pull['id']}/reviews", json={"status": "approved"})
    assert review.status_code == 201

    login("alice")
    merge = client.patch(f"/pulls/{pull['id']}", json={"status": "merged"})
    assert merge.status_code == 200

    actions = audit_actions()
    assert {"pull.review.approve", "pull.merge"}.issubset(actions)


def test_audit_logs_are_admin_only_and_filterable(client, make_repo, add_member, login):
    make_repo(name="filtered-audit")
    add_member("filtered-audit", "bob", "maintainer")

    login("alice")
    forbidden = client.get("/admin/audit-logs")
    assert forbidden.status_code == 403

    login("admin")
    response = client.get("/admin/audit-logs", params={"repo": "filtered-audit", "action": "member.add"})
    assert response.status_code == 200
    rows = response.json()
    assert len(rows) == 1
    assert rows[0]["action"] == "member.add"
    assert rows[0]["repo"] == "filtered-audit"
