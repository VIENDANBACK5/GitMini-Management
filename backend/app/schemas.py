from typing import Literal

RepoRole = Literal["owner", "maintainer", "developer", "reviewer", "viewer"]

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=1, max_length=255)


class RepoCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str = ""
    is_private: bool = False


class RepoMemberCreate(BaseModel):
    username: str = Field(min_length=1, max_length=50)
    role: RepoRole


class RepoMemberUpdate(BaseModel):
    role: RepoRole


class IssueCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    body: str = ""
    labels: list[str] = Field(default_factory=list)


class IssueUpdate(BaseModel):
    status: Literal["open", "closed"]


class PullRequestCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    body: str = ""
    source_branch: str = Field(min_length=1, max_length=255)
    target_branch: str = Field(default="main", min_length=1, max_length=255)


class PullRequestUpdate(BaseModel):
    status: Literal["open", "closed", "merged"]
    merge_commit_hash: str | None = Field(default=None, min_length=40, max_length=40)


class PullRequestReviewCreate(BaseModel):
    status: Literal["approved"] = "approved"
