def repo_names(response):
    assert response.status_code == 200, response.text
    return {repo["name"] for repo in response.json()}


def test_public_repo_visible_to_authenticated_non_member(client, make_repo, login):
    make_repo(name="public-repo")

    login("david")
    response = client.get("/repos")

    assert "public-repo" in repo_names(response)


def test_private_repo_hidden_from_non_member(client, make_repo, login):
    make_repo(name="private-repo", is_private=True)

    login("david")
    list_response = client.get("/repos")
    detail_response = client.get("/repos/private-repo")

    assert "private-repo" not in repo_names(list_response)
    assert detail_response.status_code == 404


def test_private_repo_visible_to_member_and_admin(client, make_repo, add_member, login):
    make_repo(name="member-private", is_private=True)
    add_member("member-private", "david", "viewer")

    login("david")
    member_response = client.get("/repos")
    assert "member-private" in repo_names(member_response)

    login("admin")
    admin_response = client.get("/repos")
    assert "member-private" in repo_names(admin_response)
