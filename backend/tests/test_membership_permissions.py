def test_owner_can_manage_members(client, make_repo, add_member, login):
    make_repo(name="team")
    member = add_member("team", "bob", "maintainer")
    assert member["role"] == "maintainer"

    login("alice")
    update = client.patch("/repos/team/members/bob", json={"role": "developer"})
    assert update.status_code == 200
    assert update.json()["role"] == "developer"

    remove = client.delete("/repos/team/members/bob")
    assert remove.status_code == 200


def test_maintainer_can_view_but_not_manage_members(client, make_repo, add_member, login):
    make_repo(name="maintained")
    add_member("maintained", "bob", "maintainer")

    login("bob")
    list_response = client.get("/repos/maintained/members")
    add_response = client.post("/repos/maintained/members", json={"username": "carol", "role": "developer"})

    assert list_response.status_code == 200
    assert add_response.status_code == 403


def test_viewer_cannot_view_members_or_write_issues(client, make_repo, add_member, login):
    make_repo(name="viewer-repo")
    add_member("viewer-repo", "david", "viewer")

    login("david")
    members = client.get("/repos/viewer-repo/members")
    issue = client.post("/repos/viewer-repo/issues", json={"title": "No write", "body": "", "labels": []})

    assert members.status_code == 403
    assert issue.status_code == 403


def test_last_owner_cannot_be_removed_or_demoted(client, make_repo, login):
    make_repo(name="solo")

    login("alice")
    demote = client.patch("/repos/solo/members/alice", json={"role": "maintainer"})
    remove = client.delete("/repos/solo/members/alice")

    assert demote.status_code == 400
    assert remove.status_code == 400


def test_admin_can_manage_repo_members(client, make_repo, login):
    make_repo(name="admin-managed")

    login("admin")
    add = client.post("/repos/admin-managed/members", json={"username": "bob", "role": "maintainer"})
    update = client.patch("/repos/admin-managed/members/bob", json={"role": "reviewer"})
    remove = client.delete("/repos/admin-managed/members/bob")

    assert add.status_code == 201
    assert update.status_code == 200
    assert remove.status_code == 200
