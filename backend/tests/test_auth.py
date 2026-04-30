def test_auth_me_requires_session(client):
    response = client.get("/auth/me")

    assert response.status_code == 401


def test_login_sets_usable_session(client):
    response = client.post("/auth/login", json={"username": "alice", "password": "gitmini_password"})

    assert response.status_code == 200
    assert response.json()["username"] == "alice"
    assert "gitmini_session" in response.cookies

    me = client.get("/auth/me")
    assert me.status_code == 200
    assert me.json()["username"] == "alice"


def test_invalid_login_is_rejected(client):
    response = client.post("/auth/login", json={"username": "alice", "password": "wrong"})

    assert response.status_code == 401


def test_logout_invalidates_session(client, login):
    login("alice")

    logout = client.post("/auth/logout")
    assert logout.status_code == 200

    me = client.get("/auth/me")
    assert me.status_code == 401
