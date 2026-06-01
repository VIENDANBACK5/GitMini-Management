def setup_pull(make_repo, add_member, make_pull):
    make_repo(name="governed")
    add_member("governed", "bob", "maintainer")
    add_member("governed", "carol", "developer")
    add_member("governed", "david", "reviewer")
    return make_pull("governed", actor="carol")


def test_protected_branch_merge_requires_non_author_approval(client, login, make_repo, add_member, make_pull):
    pull = setup_pull(make_repo, add_member, make_pull)

    login("alice")
    response = client.patch("/pulls/{}".format(pull["id"]), json={"status": "merged"})

    assert response.status_code == 400
    assert "Protected branch requires" in response.json()["detail"]


def test_pull_author_cannot_self_approve(client, login, make_repo, add_member, make_pull):
    make_repo(name="self-review")
    add_member("self-review", "bob", "maintainer")
    pull = make_pull("self-review", actor="bob")

    login("bob")
    response = client.post(f"/pulls/{pull['id']}/reviews", json={"status": "approved"})

    assert response.status_code == 400


def test_viewer_cannot_approve_pull(client, login, make_repo, add_member, make_pull):
    pull = setup_pull(make_repo, add_member, make_pull)
    add_member("governed", "bob", "viewer")

    login("bob")
    response = client.post(f"/pulls/{pull['id']}/reviews", json={"status": "approved"})

    assert response.status_code == 403


def test_developer_cannot_merge_after_approval(client, login, make_repo, add_member, make_pull):
    pull = setup_pull(make_repo, add_member, make_pull)

    login("david")
    approval = client.post(f"/pulls/{pull['id']}/reviews", json={"status": "approved"})
    assert approval.status_code == 201

    login("carol")
    merge = client.patch(f"/pulls/{pull['id']}", json={"status": "merged"})

    assert merge.status_code == 403


def test_owner_can_merge_after_reviewer_approval(client, login, make_repo, add_member, make_pull):
    pull = setup_pull(make_repo, add_member, make_pull)

    login("david")
    approval = client.post(f"/pulls/{pull['id']}/reviews", json={"status": "approved"})
    assert approval.status_code == 201

    login("alice")
    list_response = client.get("/repos/governed/pulls")
    listed = list_response.json()[0]
    assert listed["approval_count"] == 1
    assert listed["is_approved"] is True
    assert listed["can_merge"] is True
    assert listed["merge_blocked_reason"] is None

    merge = client.patch(f"/pulls/{pull['id']}", json={"status": "merged"})
    assert merge.status_code == 200
    assert merge.json()["status"] == "merged"


def test_pr_list_explains_blocked_merge(client, login, make_repo, add_member, make_pull):
    setup_pull(make_repo, add_member, make_pull)

    login("alice")
    response = client.get("/repos/governed/pulls")
    pull = response.json()[0]

    assert pull["approval_count"] == 0
    assert pull["is_approved"] is False
    assert pull["can_merge"] is False
    assert pull["merge_blocked_reason"] == "protected_branch_requires_approval"
