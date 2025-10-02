"""
Collaborative Features for Sprint Lens SDK

This module provides comprehensive collaboration capabilities for team-based
dataset development and management.

Features:
- User and team management
- Dataset sharing and permissions
- Comments and annotations
- Version control and branching
- Activity feeds and notifications
- Collaborative editing workflows
- Access control and security
"""

import json
import uuid
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Set, Union
from enum import Enum

import logging


class PermissionLevel(Enum):
    """Permission levels for dataset access."""
    NONE = "none"
    READ = "read"
    WRITE = "write"
    ADMIN = "admin"
    OWNER = "owner"


class CommentType(Enum):
    """Types of comments."""
    GENERAL = "general"
    QUESTION = "question"
    SUGGESTION = "suggestion"
    ISSUE = "issue"


class AnnotationType(Enum):
    """Types of annotations."""
    NOTE = "note"
    WARNING = "warning"
    ERROR = "error"
    SUGGESTION = "suggestion"


class ActivityType(Enum):
    """Types of activities that can be tracked."""
    DATASET_CREATED = "dataset_created"
    DATASET_UPDATED = "dataset_updated"
    DATASET_DELETED = "dataset_deleted"
    DATASET_SHARED = "dataset_shared"
    COMMENT_ADDED = "comment_added"
    COMMENT_UPDATED = "comment_updated"
    COMMENT_DELETED = "comment_deleted"
    ANNOTATION_ADDED = "annotation_added"
    ANNOTATION_UPDATED = "annotation_updated"
    ANNOTATION_DELETED = "annotation_deleted"
    PERMISSION_CHANGED = "permission_changed"
    USER_JOINED = "user_joined"
    USER_LEFT = "user_left"
    BRANCH_CREATED = "branch_created"
    BRANCH_MERGED = "branch_merged"
    VERSION_TAGGED = "version_tagged"


class NotificationType(Enum):
    """Types of notifications."""
    MENTION = "mention"
    COMMENT_REPLY = "comment_reply"
    DATASET_SHARED = "dataset_shared"
    PERMISSION_CHANGED = "permission_changed"
    ACTIVITY_DIGEST = "activity_digest"
    SYSTEM_ALERT = "system_alert"


@dataclass
class User:
    """Represents a user in the collaboration system."""
    
    user_id: str
    username: str
    email: str
    display_name: str
    avatar_url: Optional[str] = None
    role: str = "user"
    teams: List[str] = field(default_factory=list)
    preferences: Dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    last_active: str = field(default_factory=lambda: datetime.now().isoformat())
    is_active: bool = True
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "user_id": self.user_id,
            "username": self.username,
            "email": self.email,
            "display_name": self.display_name,
            "avatar_url": self.avatar_url,
            "role": self.role,
            "teams": self.teams,
            "preferences": self.preferences,
            "created_at": self.created_at,
            "last_active": self.last_active,
            "is_active": self.is_active
        }


@dataclass
class Team:
    """Represents a team in the collaboration system."""
    
    team_id: str
    name: str
    description: Optional[str] = None
    members: List[str] = field(default_factory=list)  # User IDs
    admins: List[str] = field(default_factory=list)   # User IDs with admin rights
    created_by: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())
    is_active: bool = True
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "team_id": self.team_id,
            "name": self.name,
            "description": self.description,
            "members": self.members,
            "admins": self.admins,
            "created_by": self.created_by,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "is_active": self.is_active
        }


@dataclass
class Permission:
    """Represents a permission for a resource."""
    
    permission_id: str
    resource_id: str
    resource_type: str  # "dataset", "project", etc.
    subject_id: str     # User ID or Team ID
    subject_type: str   # "user" or "team"
    permission_level: PermissionLevel
    granted_by: Optional[str] = None  # User ID who granted permission
    granted_at: str = field(default_factory=lambda: datetime.now().isoformat())
    expires_at: Optional[str] = None
    is_active: bool = True
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "permission_id": self.permission_id,
            "resource_id": self.resource_id,
            "resource_type": self.resource_type,
            "subject_id": self.subject_id,
            "subject_type": self.subject_type,
            "permission_level": self.permission_level.value,
            "granted_by": self.granted_by,
            "granted_at": self.granted_at,
            "expires_at": self.expires_at,
            "is_active": self.is_active
        }


@dataclass
class Comment:
    """Represents a comment on a dataset or item."""
    
    comment_id: str
    resource_id: str
    resource_type: str  # "dataset", "item", etc.
    author_id: str
    content: str
    mentions: List[str] = field(default_factory=list)  # User IDs mentioned
    replies: List[str] = field(default_factory=list)   # Comment IDs
    parent_id: Optional[str] = None  # For threaded comments
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())
    is_deleted: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "comment_id": self.comment_id,
            "resource_id": self.resource_id,
            "resource_type": self.resource_type,
            "author_id": self.author_id,
            "content": self.content,
            "mentions": self.mentions,
            "replies": self.replies,
            "parent_id": self.parent_id,
            "metadata": self.metadata,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "is_deleted": self.is_deleted
        }


@dataclass
class Annotation:
    """Represents an annotation on dataset fields or values."""
    
    annotation_id: str
    dataset_id: str
    field_name: Optional[str] = None  # Field-level annotation
    item_id: Optional[str] = None     # Item-level annotation
    annotation_type: str = "note"     # "note", "warning", "error", "suggestion"
    title: str = ""
    content: str = ""
    author_id: Optional[str] = None
    tags: List[str] = field(default_factory=list)
    coordinates: Optional[Dict[str, Any]] = None  # For UI positioning
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())
    is_resolved: bool = False
    resolved_by: Optional[str] = None
    resolved_at: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "annotation_id": self.annotation_id,
            "dataset_id": self.dataset_id,
            "field_name": self.field_name,
            "item_id": self.item_id,
            "annotation_type": self.annotation_type,
            "title": self.title,
            "content": self.content,
            "author_id": self.author_id,
            "tags": self.tags,
            "coordinates": self.coordinates,
            "metadata": self.metadata,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "is_resolved": self.is_resolved,
            "resolved_by": self.resolved_by,
            "resolved_at": self.resolved_at
        }


@dataclass
class Activity:
    """Represents an activity in the system."""
    
    activity_id: str
    activity_type: ActivityType
    actor_id: str  # User who performed the activity
    resource_id: str
    resource_type: str
    details: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    is_public: bool = True
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "activity_id": self.activity_id,
            "activity_type": self.activity_type.value,
            "actor_id": self.actor_id,
            "resource_id": self.resource_id,
            "resource_type": self.resource_type,
            "details": self.details,
            "metadata": self.metadata,
            "timestamp": self.timestamp,
            "is_public": self.is_public
        }


@dataclass
class Notification:
    """Represents a notification to a user."""
    
    notification_id: str
    user_id: str
    notification_type: NotificationType
    title: str
    message: str
    related_resource_id: Optional[str] = None
    related_resource_type: Optional[str] = None
    actor_id: Optional[str] = None  # User who triggered the notification
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    read_at: Optional[str] = None
    is_read: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "notification_id": self.notification_id,
            "user_id": self.user_id,
            "notification_type": self.notification_type.value,
            "title": self.title,
            "message": self.message,
            "related_resource_id": self.related_resource_id,
            "related_resource_type": self.related_resource_type,
            "actor_id": self.actor_id,
            "metadata": self.metadata,
            "created_at": self.created_at,
            "read_at": self.read_at,
            "is_read": self.is_read
        }


class CollaborationManager:
    """Main collaboration management system."""
    
    def __init__(self):
        """Initialize the collaboration manager."""
        self.logger = logging.getLogger(__name__)
        
        # Storage for collaboration entities
        self.users: Dict[str, User] = {}
        self.teams: Dict[str, Team] = {}
        self.permissions: Dict[str, Permission] = {}
        self.comments: Dict[str, Comment] = {}
        self.annotations: Dict[str, Annotation] = {}
        self.activities: List[Activity] = []
        self.notifications: Dict[str, Notification] = {}
        
        # Indexes for efficient querying
        self._user_permissions: Dict[str, List[str]] = {}  # user_id -> permission_ids
        self._resource_permissions: Dict[str, List[str]] = {}  # resource_id -> permission_ids
        self._resource_comments: Dict[str, List[str]] = {}  # resource_id -> comment_ids
        self._resource_annotations: Dict[str, List[str]] = {}  # resource_id -> annotation_ids
        self._user_notifications: Dict[str, List[str]] = {}  # user_id -> notification_ids
    
    # ============================================================================================
    # User Management
    # ============================================================================================
    
    def create_user(
        self,
        username: str,
        email: str,
        display_name: str,
        avatar_url: Optional[str] = None,
        role: str = "user",
        user_id: Optional[str] = None
    ) -> User:
        """
        Create a new user.
        
        Args:
            username: Unique username
            email: User's email address
            display_name: Display name for the user
            avatar_url: Optional avatar URL
            role: User role (user, admin, etc.)
            user_id: Optional user ID (generates one if not provided)
        
        Returns:
            Created User object
        """
        if not user_id:
            user_id = str(uuid.uuid4())
        
        # Check for duplicate username or email
        for existing_user in self.users.values():
            if existing_user.username == username:
                raise ValueError(f"Username '{username}' already exists")
            if existing_user.email == email:
                raise ValueError(f"Email '{email}' already exists")
        
        user = User(
            user_id=user_id,
            username=username,
            email=email,
            display_name=display_name,
            avatar_url=avatar_url,
            role=role
        )
        
        self.users[user_id] = user
        self._user_permissions[user_id] = []
        self._user_notifications[user_id] = []
        
        self.logger.info(f"Created user: {username} ({user_id})")
        return user
    
    def get_user(self, user_id: str) -> Optional[User]:
        """Get a user by ID."""
        return self.users.get(user_id)
    
    def get_user_by_username(self, username: str) -> Optional[User]:
        """Get a user by username."""
        for user in self.users.values():
            if user.username == username:
                return user
        return None
    
    def update_user(self, user_id: str, **kwargs) -> Optional[User]:
        """Update user information."""
        user = self.users.get(user_id)
        if not user:
            return None
        
        # Update fields
        for key, value in kwargs.items():
            if hasattr(user, key):
                setattr(user, key, value)
        
        user.last_active = datetime.now().isoformat()
        self.logger.info(f"Updated user: {user.username} ({user_id})")
        return user
    
    def list_users(self, active_only: bool = True) -> List[User]:
        """List all users."""
        users = list(self.users.values())
        if active_only:
            users = [u for u in users if u.is_active]
        return sorted(users, key=lambda u: u.username)
    
    # ============================================================================================
    # Team Management
    # ============================================================================================
    
    def create_team(
        self,
        name: str,
        description: Optional[str] = None,
        created_by: Optional[str] = None,
        team_id: Optional[str] = None
    ) -> Team:
        """
        Create a new team.
        
        Args:
            name: Team name
            description: Optional team description
            created_by: User ID of the creator
            team_id: Optional team ID
        
        Returns:
            Created Team object
        """
        if not team_id:
            team_id = str(uuid.uuid4())
        
        # Check for duplicate name
        for existing_team in self.teams.values():
            if existing_team.name == name and existing_team.is_active:
                raise ValueError(f"Team name '{name}' already exists")
        
        team = Team(
            team_id=team_id,
            name=name,
            description=description,
            created_by=created_by
        )
        
        # Add creator as admin
        if created_by:
            team.members.append(created_by)
            team.admins.append(created_by)
        
        self.teams[team_id] = team
        self.logger.info(f"Created team: {name} ({team_id})")
        return team
    
    def add_team_member(self, team_id: str, user_id: str, is_admin: bool = False) -> bool:
        """Add a user to a team."""
        team = self.teams.get(team_id)
        user = self.users.get(user_id)
        
        if not team or not user:
            return False
        
        if user_id not in team.members:
            team.members.append(user_id)
            user.teams.append(team_id)
        
        if is_admin and user_id not in team.admins:
            team.admins.append(user_id)
        
        team.updated_at = datetime.now().isoformat()
        self.logger.info(f"Added user {user.username} to team {team.name}")
        return True
    
    def remove_team_member(self, team_id: str, user_id: str) -> bool:
        """Remove a user from a team."""
        team = self.teams.get(team_id)
        user = self.users.get(user_id)
        
        if not team or not user:
            return False
        
        if user_id in team.members:
            team.members.remove(user_id)
        if user_id in team.admins:
            team.admins.remove(user_id)
        if team_id in user.teams:
            user.teams.remove(team_id)
        
        team.updated_at = datetime.now().isoformat()
        self.logger.info(f"Removed user {user.username} from team {team.name}")
        return True
    
    def get_team(self, team_id: str) -> Optional[Team]:
        """Get a team by ID."""
        return self.teams.get(team_id)
    
    def get_user_teams(self, user_id: str) -> List[Team]:
        """Get all teams for a user."""
        user = self.users.get(user_id)
        if not user:
            return []
        
        return [self.teams[team_id] for team_id in user.teams if team_id in self.teams]
    
    # ============================================================================================
    # Permission Management
    # ============================================================================================
    
    def grant_permission(
        self,
        resource_id: str,
        resource_type: str,
        subject_id: str,
        subject_type: str,
        permission_level: PermissionLevel,
        granted_by: Optional[str] = None,
        expires_at: Optional[str] = None
    ) -> Permission:
        """
        Grant permission to a user or team for a resource.
        
        Args:
            resource_id: ID of the resource
            resource_type: Type of resource (dataset, project, etc.)
            subject_id: ID of user or team receiving permission
            subject_type: "user" or "team"
            permission_level: Level of permission to grant
            granted_by: User ID who granted the permission
            expires_at: Optional expiration timestamp
        
        Returns:
            Created Permission object
        """
        permission_id = str(uuid.uuid4())
        
        # Check if permission already exists
        existing = self._find_permission(resource_id, subject_id, subject_type)
        if existing:
            # Update existing permission
            existing.permission_level = permission_level
            existing.granted_by = granted_by
            existing.granted_at = datetime.now().isoformat()
            existing.expires_at = expires_at
            existing.is_active = True
            self.logger.info(f"Updated permission for {subject_type} {subject_id} on {resource_type} {resource_id}")
            return existing
        
        permission = Permission(
            permission_id=permission_id,
            resource_id=resource_id,
            resource_type=resource_type,
            subject_id=subject_id,
            subject_type=subject_type,
            permission_level=permission_level,
            granted_by=granted_by,
            expires_at=expires_at
        )
        
        self.permissions[permission_id] = permission
        
        # Update indexes
        if subject_type == "user":
            if subject_id not in self._user_permissions:
                self._user_permissions[subject_id] = []
            self._user_permissions[subject_id].append(permission_id)
        
        if resource_id not in self._resource_permissions:
            self._resource_permissions[resource_id] = []
        self._resource_permissions[resource_id].append(permission_id)
        
        self.logger.info(f"Granted {permission_level.value} permission to {subject_type} {subject_id} on {resource_type} {resource_id}")
        return permission
    
    def revoke_permission(self, resource_id: str, subject_id: str, subject_type: str) -> bool:
        """Revoke permission for a user or team on a resource."""
        permission = self._find_permission(resource_id, subject_id, subject_type)
        if not permission:
            return False
        
        permission.is_active = False
        self.logger.info(f"Revoked permission for {subject_type} {subject_id} on resource {resource_id}")
        return True
    
    def check_permission(
        self,
        user_id: str,
        resource_id: str,
        required_level: PermissionLevel
    ) -> bool:
        """
        Check if a user has the required permission level for a resource.
        
        Args:
            user_id: User ID to check
            resource_id: Resource ID to check access for
            required_level: Minimum permission level required
        
        Returns:
            True if user has required permission, False otherwise
        """
        user = self.users.get(user_id)
        if not user:
            return False
        
        # Check direct user permissions
        user_permission_ids = self._user_permissions.get(user_id, [])
        for perm_id in user_permission_ids:
            permission = self.permissions.get(perm_id)
            if (permission and permission.is_active and 
                permission.resource_id == resource_id and
                self._permission_level_sufficient(permission.permission_level, required_level)):
                
                # Check if permission has expired
                if permission.expires_at:
                    if datetime.fromisoformat(permission.expires_at) < datetime.now():
                        continue
                
                return True
        
        # Check team permissions
        for team_id in user.teams:
            team = self.teams.get(team_id)
            if not team or not team.is_active:
                continue
            
            for perm_id in self.permissions:
                permission = self.permissions[perm_id]
                if (permission.is_active and 
                    permission.resource_id == resource_id and
                    permission.subject_id == team_id and
                    permission.subject_type == "team" and
                    self._permission_level_sufficient(permission.permission_level, required_level)):
                    
                    # Check if permission has expired
                    if permission.expires_at:
                        if datetime.fromisoformat(permission.expires_at) < datetime.now():
                            continue
                    
                    return True
        
        return False
    
    def get_resource_permissions(self, resource_id: str) -> List[Permission]:
        """Get all permissions for a resource."""
        permission_ids = self._resource_permissions.get(resource_id, [])
        return [self.permissions[pid] for pid in permission_ids if pid in self.permissions]
    
    def get_user_permissions(self, user_id: str) -> List[Permission]:
        """Get all permissions for a user."""
        permission_ids = self._user_permissions.get(user_id, [])
        permissions = [self.permissions[pid] for pid in permission_ids if pid in self.permissions]
        
        # Add team permissions
        user = self.users.get(user_id)
        if user:
            for team_id in user.teams:
                for permission in self.permissions.values():
                    if (permission.subject_id == team_id and 
                        permission.subject_type == "team" and
                        permission.is_active):
                        permissions.append(permission)
        
        return permissions
    
    def _find_permission(
        self, 
        resource_id: str, 
        subject_id: str, 
        subject_type: str
    ) -> Optional[Permission]:
        """Find existing permission for a resource and subject."""
        for permission in self.permissions.values():
            if (permission.resource_id == resource_id and
                permission.subject_id == subject_id and
                permission.subject_type == subject_type and
                permission.is_active):
                return permission
        return None
    
    def _permission_level_sufficient(
        self, 
        granted_level: PermissionLevel, 
        required_level: PermissionLevel
    ) -> bool:
        """Check if granted permission level is sufficient for required level."""
        level_hierarchy = {
            PermissionLevel.NONE: 0,
            PermissionLevel.READ: 1,
            PermissionLevel.WRITE: 2,
            PermissionLevel.ADMIN: 3,
            PermissionLevel.OWNER: 4
        }
        
        return level_hierarchy[granted_level] >= level_hierarchy[required_level]
    
    # ============================================================================================
    # Comment Management
    # ============================================================================================
    
    def add_comment(
        self,
        resource_id: str,
        resource_type: str,
        author_id: str,
        content: str,
        parent_id: Optional[str] = None,
        mentions: Optional[List[str]] = None
    ) -> Comment:
        """
        Add a comment to a resource.
        
        Args:
            resource_id: ID of the resource being commented on
            resource_type: Type of resource (dataset, item, etc.)
            author_id: User ID of the comment author
            content: Comment content
            parent_id: Optional parent comment ID for replies
            mentions: Optional list of user IDs mentioned in the comment
        
        Returns:
            Created Comment object
        """
        comment_id = str(uuid.uuid4())
        
        comment = Comment(
            comment_id=comment_id,
            resource_id=resource_id,
            resource_type=resource_type,
            author_id=author_id,
            content=content,
            parent_id=parent_id,
            mentions=mentions or []
        )
        
        self.comments[comment_id] = comment
        
        # Update indexes
        if resource_id not in self._resource_comments:
            self._resource_comments[resource_id] = []
        self._resource_comments[resource_id].append(comment_id)
        
        # Update parent comment if this is a reply
        if parent_id and parent_id in self.comments:
            parent_comment = self.comments[parent_id]
            parent_comment.replies.append(comment_id)
        
        # Create notifications for mentions
        for mentioned_user_id in comment.mentions:
            self._create_notification(
                user_id=mentioned_user_id,
                notification_type=NotificationType.MENTION,
                title="You were mentioned in a comment",
                message=f"{self.users[author_id].display_name} mentioned you in a comment",
                related_resource_id=resource_id,
                related_resource_type=resource_type,
                actor_id=author_id
            )
        
        # Record activity
        self._record_activity(
            activity_type=ActivityType.COMMENT_ADDED,
            actor_id=author_id,
            resource_id=resource_id,
            resource_type=resource_type,
            details={"comment_id": comment_id}
        )
        
        self.logger.info(f"Added comment by {author_id} on {resource_type} {resource_id}")
        return comment
    
    def update_comment(self, comment_id: str, content: str, mentions: Optional[List[str]] = None) -> Optional[Comment]:
        """Update a comment."""
        comment = self.comments.get(comment_id)
        if not comment:
            return None
        
        comment.content = content
        if mentions is not None:
            comment.mentions = mentions
        comment.updated_at = datetime.now().isoformat()
        
        # Record activity
        self._record_activity(
            activity_type=ActivityType.COMMENT_UPDATED,
            actor_id=comment.author_id,
            resource_id=comment.resource_id,
            resource_type=comment.resource_type,
            details={"comment_id": comment_id}
        )
        
        self.logger.info(f"Updated comment {comment_id}")
        return comment
    
    def delete_comment(self, comment_id: str) -> bool:
        """Delete a comment (soft delete)."""
        comment = self.comments.get(comment_id)
        if not comment:
            return False
        
        comment.is_deleted = True
        comment.updated_at = datetime.now().isoformat()
        
        # Record activity
        self._record_activity(
            activity_type=ActivityType.COMMENT_DELETED,
            actor_id=comment.author_id,
            resource_id=comment.resource_id,
            resource_type=comment.resource_type,
            details={"comment_id": comment_id}
        )
        
        self.logger.info(f"Deleted comment {comment_id}")
        return True
    
    def get_resource_comments(self, resource_id: str, include_deleted: bool = False) -> List[Comment]:
        """Get all comments for a resource."""
        comment_ids = self._resource_comments.get(resource_id, [])
        comments = [self.comments[cid] for cid in comment_ids if cid in self.comments]
        
        if not include_deleted:
            comments = [c for c in comments if not c.is_deleted]
        
        return sorted(comments, key=lambda c: c.created_at)
    
    # ============================================================================================
    # Annotation Management
    # ============================================================================================
    
    def add_annotation(
        self,
        dataset_id: str,
        annotation_type: str,
        title: str,
        content: str,
        author_id: Optional[str] = None,
        field_name: Optional[str] = None,
        item_id: Optional[str] = None,
        tags: Optional[List[str]] = None,
        coordinates: Optional[Dict[str, Any]] = None
    ) -> Annotation:
        """
        Add an annotation to a dataset.
        
        Args:
            dataset_id: ID of the dataset
            annotation_type: Type of annotation (note, warning, error, suggestion)
            title: Annotation title
            content: Annotation content
            author_id: User ID of the annotation author
            field_name: Optional field name for field-level annotations
            item_id: Optional item ID for item-level annotations
            tags: Optional tags for categorization
            coordinates: Optional UI coordinates for positioning
        
        Returns:
            Created Annotation object
        """
        annotation_id = str(uuid.uuid4())
        
        annotation = Annotation(
            annotation_id=annotation_id,
            dataset_id=dataset_id,
            field_name=field_name,
            item_id=item_id,
            annotation_type=annotation_type,
            title=title,
            content=content,
            author_id=author_id,
            tags=tags or [],
            coordinates=coordinates
        )
        
        self.annotations[annotation_id] = annotation
        
        # Update indexes
        if dataset_id not in self._resource_annotations:
            self._resource_annotations[dataset_id] = []
        self._resource_annotations[dataset_id].append(annotation_id)
        
        # Record activity
        self._record_activity(
            activity_type=ActivityType.ANNOTATION_ADDED,
            actor_id=author_id,
            resource_id=dataset_id,
            resource_type="dataset",
            details={"annotation_id": annotation_id, "annotation_type": annotation_type}
        )
        
        self.logger.info(f"Added {annotation_type} annotation to dataset {dataset_id}")
        return annotation
    
    def update_annotation(
        self,
        annotation_id: str,
        title: Optional[str] = None,
        content: Optional[str] = None,
        tags: Optional[List[str]] = None
    ) -> Optional[Annotation]:
        """Update an annotation."""
        annotation = self.annotations.get(annotation_id)
        if not annotation:
            return None
        
        if title is not None:
            annotation.title = title
        if content is not None:
            annotation.content = content
        if tags is not None:
            annotation.tags = tags
        
        annotation.updated_at = datetime.now().isoformat()
        
        # Record activity
        self._record_activity(
            activity_type=ActivityType.ANNOTATION_UPDATED,
            actor_id=annotation.author_id,
            resource_id=annotation.dataset_id,
            resource_type="dataset",
            details={"annotation_id": annotation_id}
        )
        
        self.logger.info(f"Updated annotation {annotation_id}")
        return annotation
    
    def resolve_annotation(self, annotation_id: str, resolved_by: str) -> Optional[Annotation]:
        """Mark an annotation as resolved."""
        annotation = self.annotations.get(annotation_id)
        if not annotation:
            return None
        
        annotation.is_resolved = True
        annotation.resolved_by = resolved_by
        annotation.resolved_at = datetime.now().isoformat()
        annotation.updated_at = datetime.now().isoformat()
        
        self.logger.info(f"Resolved annotation {annotation_id}")
        return annotation
    
    def get_dataset_annotations(
        self, 
        dataset_id: str, 
        include_resolved: bool = True,
        field_name: Optional[str] = None,
        annotation_type: Optional[str] = None
    ) -> List[Annotation]:
        """Get annotations for a dataset with optional filtering."""
        annotation_ids = self._resource_annotations.get(dataset_id, [])
        annotations = [self.annotations[aid] for aid in annotation_ids if aid in self.annotations]
        
        # Apply filters
        if not include_resolved:
            annotations = [a for a in annotations if not a.is_resolved]
        
        if field_name:
            annotations = [a for a in annotations if a.field_name == field_name]
        
        if annotation_type:
            annotations = [a for a in annotations if a.annotation_type == annotation_type]
        
        return sorted(annotations, key=lambda a: a.created_at)
    
    # ============================================================================================
    # Activity Tracking
    # ============================================================================================
    
    def _record_activity(
        self,
        activity_type: ActivityType,
        actor_id: Optional[str],
        resource_id: str,
        resource_type: str,
        details: Optional[Dict[str, Any]] = None
    ):
        """Record an activity in the system."""
        if not actor_id:
            return
        
        activity = Activity(
            activity_id=str(uuid.uuid4()),
            activity_type=activity_type,
            actor_id=actor_id,
            resource_id=resource_id,
            resource_type=resource_type,
            details=details or {}
        )
        
        self.activities.append(activity)
        
        # Keep only last 1000 activities to prevent memory issues
        if len(self.activities) > 1000:
            self.activities = self.activities[-1000:]
    
    def get_activities(
        self,
        resource_id: Optional[str] = None,
        user_id: Optional[str] = None,
        activity_types: Optional[List[ActivityType]] = None,
        limit: int = 100
    ) -> List[Activity]:
        """Get activities with optional filtering."""
        activities = self.activities.copy()
        
        # Apply filters
        if resource_id:
            activities = [a for a in activities if a.resource_id == resource_id]
        
        if user_id:
            activities = [a for a in activities if a.actor_id == user_id]
        
        if activity_types:
            activities = [a for a in activities if a.activity_type in activity_types]
        
        # Sort by timestamp (newest first) and limit
        activities.sort(key=lambda a: a.timestamp, reverse=True)
        return activities[:limit]
    
    # ============================================================================================
    # Notification Management
    # ============================================================================================
    
    def _create_notification(
        self,
        user_id: str,
        notification_type: NotificationType,
        title: str,
        message: str,
        related_resource_id: Optional[str] = None,
        related_resource_type: Optional[str] = None,
        actor_id: Optional[str] = None
    ) -> Notification:
        """Create a notification for a user."""
        notification_id = str(uuid.uuid4())
        
        notification = Notification(
            notification_id=notification_id,
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            message=message,
            related_resource_id=related_resource_id,
            related_resource_type=related_resource_type,
            actor_id=actor_id
        )
        
        self.notifications[notification_id] = notification
        
        # Update index
        if user_id not in self._user_notifications:
            self._user_notifications[user_id] = []
        self._user_notifications[user_id].append(notification_id)
        
        return notification
    
    def get_user_notifications(
        self,
        user_id: str,
        unread_only: bool = False,
        limit: int = 50
    ) -> List[Notification]:
        """Get notifications for a user."""
        notification_ids = self._user_notifications.get(user_id, [])
        notifications = [self.notifications[nid] for nid in notification_ids if nid in self.notifications]
        
        if unread_only:
            notifications = [n for n in notifications if not n.is_read]
        
        # Sort by creation time (newest first) and limit
        notifications.sort(key=lambda n: n.created_at, reverse=True)
        return notifications[:limit]
    
    def mark_notification_read(self, notification_id: str) -> bool:
        """Mark a notification as read."""
        notification = self.notifications.get(notification_id)
        if not notification:
            return False
        
        notification.is_read = True
        notification.read_at = datetime.now().isoformat()
        return True
    
    def mark_all_notifications_read(self, user_id: str) -> int:
        """Mark all notifications as read for a user."""
        notification_ids = self._user_notifications.get(user_id, [])
        count = 0
        
        for nid in notification_ids:
            notification = self.notifications.get(nid)
            if notification and not notification.is_read:
                notification.is_read = True
                notification.read_at = datetime.now().isoformat()
                count += 1
        
        return count
    
    # ============================================================================================
    # Export/Import
    # ============================================================================================
    
    def export_collaboration_data(self, format: str = "json") -> Union[str, Dict[str, Any]]:
        """Export all collaboration data."""
        data = {
            "users": {uid: user.to_dict() for uid, user in self.users.items()},
            "teams": {tid: team.to_dict() for tid, team in self.teams.items()},
            "permissions": {pid: perm.to_dict() for pid, perm in self.permissions.items()},
            "comments": {cid: comment.to_dict() for cid, comment in self.comments.items()},
            "annotations": {aid: ann.to_dict() for aid, ann in self.annotations.items()},
            "activities": [activity.to_dict() for activity in self.activities],
            "notifications": {nid: notif.to_dict() for nid, notif in self.notifications.items()},
            "exported_at": datetime.now().isoformat()
        }
        
        if format.lower() == "json":
            return json.dumps(data, indent=2)
        return data
    
    def import_collaboration_data(self, data: Union[str, Dict[str, Any]]) -> Dict[str, int]:
        """Import collaboration data."""
        if isinstance(data, str):
            data = json.loads(data)
        
        counts = {"users": 0, "teams": 0, "permissions": 0, "comments": 0, "annotations": 0, "activities": 0, "notifications": 0}
        
        # Import users
        for user_data in data.get("users", {}).values():
            user = User(**user_data)
            self.users[user.user_id] = user
            self._user_permissions[user.user_id] = []
            self._user_notifications[user.user_id] = []
            counts["users"] += 1
        
        # Import teams
        for team_data in data.get("teams", {}).values():
            team = Team(**team_data)
            self.teams[team.team_id] = team
            counts["teams"] += 1
        
        # Import permissions
        for perm_data in data.get("permissions", {}).values():
            perm_data["permission_level"] = PermissionLevel(perm_data["permission_level"])
            permission = Permission(**perm_data)
            self.permissions[permission.permission_id] = permission
            counts["permissions"] += 1
        
        # Import comments
        for comment_data in data.get("comments", {}).values():
            comment = Comment(**comment_data)
            self.comments[comment.comment_id] = comment
            counts["comments"] += 1
        
        # Import annotations
        for ann_data in data.get("annotations", {}).values():
            annotation = Annotation(**ann_data)
            self.annotations[annotation.annotation_id] = annotation
            counts["annotations"] += 1
        
        # Import activities
        for activity_data in data.get("activities", []):
            activity_data["activity_type"] = ActivityType(activity_data["activity_type"])
            activity = Activity(**activity_data)
            self.activities.append(activity)
            counts["activities"] += 1
        
        # Import notifications
        for notif_data in data.get("notifications", {}).values():
            notif_data["notification_type"] = NotificationType(notif_data["notification_type"])
            notification = Notification(**notif_data)
            self.notifications[notification.notification_id] = notification
            counts["notifications"] += 1
        
        # Rebuild indexes
        self._rebuild_indexes()
        
        self.logger.info(f"Imported collaboration data: {counts}")
        return counts
    
    def _rebuild_indexes(self):
        """Rebuild all internal indexes."""
        # Clear indexes
        self._user_permissions.clear()
        self._resource_permissions.clear()
        self._resource_comments.clear()
        self._resource_annotations.clear()
        self._user_notifications.clear()
        
        # Rebuild permission indexes
        for permission in self.permissions.values():
            if permission.subject_type == "user":
                if permission.subject_id not in self._user_permissions:
                    self._user_permissions[permission.subject_id] = []
                self._user_permissions[permission.subject_id].append(permission.permission_id)
            
            if permission.resource_id not in self._resource_permissions:
                self._resource_permissions[permission.resource_id] = []
            self._resource_permissions[permission.resource_id].append(permission.permission_id)
        
        # Rebuild comment indexes
        for comment in self.comments.values():
            if comment.resource_id not in self._resource_comments:
                self._resource_comments[comment.resource_id] = []
            self._resource_comments[comment.resource_id].append(comment.comment_id)
        
        # Rebuild annotation indexes
        for annotation in self.annotations.values():
            if annotation.dataset_id not in self._resource_annotations:
                self._resource_annotations[annotation.dataset_id] = []
            self._resource_annotations[annotation.dataset_id].append(annotation.annotation_id)
        
        # Rebuild notification indexes
        for notification in self.notifications.values():
            if notification.user_id not in self._user_notifications:
                self._user_notifications[notification.user_id] = []
            self._user_notifications[notification.user_id].append(notification.notification_id)


# Convenience functions

def create_collaboration_manager() -> CollaborationManager:
    """Create a new collaboration manager."""
    return CollaborationManager()