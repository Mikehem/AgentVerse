#!/usr/bin/env python3
"""
Standalone Collaborative Features Test

This script tests the collaboration features independently without importing
the full Sprint Lens SDK, avoiding circular import issues.
"""

import sys
import json
from datetime import datetime
from pathlib import Path

# Add the specific module to the path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

try:
    from sprintlens.utils.collaboration import (
        CollaborationManager, PermissionLevel, CommentType, AnnotationType
    )
    print("✅ Collaboration module imported successfully")
except ImportError as e:
    print(f"❌ Failed to import collaboration module: {e}")
    sys.exit(1)


def test_collaboration_features():
    """Test core collaboration functionality."""
    print("\n" + "="*80)
    print("🤝 COLLABORATION FEATURES STANDALONE TEST")
    print("="*80)
    
    # Initialize collaboration manager
    collaboration_manager = CollaborationManager()
    
    # === 1. Create Users ===
    print("\n👥 Step 1: Creating Users")
    print("-" * 40)
    
    alice = collaboration_manager.create_user(
        username="alice_data",
        email="alice@company.com",
        display_name="Alice Chen",
        role="admin"
    )
    print(f"✅ Created user: {alice.display_name} ({alice.username})")
    
    bob = collaboration_manager.create_user(
        username="bob_ml",
        email="bob@company.com",
        display_name="Bob Johnson",
        role="user"
    )
    print(f"✅ Created user: {bob.display_name} ({bob.username})")
    
    # === 2. Create Team ===
    print("\n🏢 Step 2: Creating Team")
    print("-" * 40)
    
    team = collaboration_manager.create_team(
        name="ML Research Team",
        description="Machine Learning research and dataset development",
        created_by=alice.user_id
    )
    
    # Add members to the team
    collaboration_manager.add_team_member(team.team_id, alice.user_id, alice.user_id)
    collaboration_manager.add_team_member(team.team_id, bob.user_id, alice.user_id)
    
    # Get updated team info
    updated_team = collaboration_manager.teams[team.team_id]
    print(f"✅ Created team: {team.name} with {len(updated_team.members)} members")
    
    # === 3. Grant Permissions ===
    print("\n🔐 Step 3: Granting Permissions")
    print("-" * 40)
    
    dataset_id = "test_dataset_123"
    
    permission = collaboration_manager.grant_permission(
        resource_id=dataset_id,
        resource_type="dataset",
        subject_id=team.team_id,
        subject_type="team",
        permission_level=PermissionLevel.ADMIN,
        granted_by=alice.user_id
    )
    print(f"✅ Granted {permission.permission_level.name} permission to team")
    
    # === 4. Add Comments ===
    print("\n💬 Step 4: Adding Comments")
    print("-" * 40)
    
    comment1 = collaboration_manager.add_comment(
        resource_id=dataset_id,
        resource_type="dataset",
        author_id=alice.user_id,
        content="This dataset looks great! Let's add more examples."
    )
    print(f"✅ Alice added comment: {comment1.content[:30]}...")
    
    comment2 = collaboration_manager.add_comment(
        resource_id=dataset_id,
        resource_type="dataset",
        author_id=bob.user_id,
        content="@alice_data I agree! I'll work on adding transformer examples.",
        parent_id=comment1.comment_id,
        mentions=[alice.user_id]
    )
    print(f"✅ Bob replied: {comment2.content[:30]}...")
    
    # === 5. Add Annotations ===
    print("\n📝 Step 5: Adding Annotations")
    print("-" * 40)
    
    annotation = collaboration_manager.add_annotation(
        dataset_id=dataset_id,
        annotation_type="SUGGESTION",
        title="Difficulty Field Enhancement",
        content="Consider adding 'expert' level for advanced topics",
        author_id=alice.user_id,
        field_name="difficulty"
    )
    print(f"✅ Alice annotated field: {annotation.field_name}")
    
    # === 6. Get Summary ===
    print("\n📊 Step 6: Getting Summary")
    print("-" * 40)
    
    permissions = collaboration_manager.get_resource_permissions(dataset_id, "dataset")
    comments = collaboration_manager.get_comments(dataset_id, "dataset")
    annotations = collaboration_manager.get_annotations(dataset_id, "dataset")
    activities = collaboration_manager.get_recent_activities(dataset_id, "dataset", limit=10)
    
    print(f"📋 Summary for {dataset_id}:")
    print(f"   • Permissions: {len(permissions)}")
    print(f"   • Comments: {len(comments)}")
    print(f"   • Annotations: {len(annotations)}")
    print(f"   • Activities: {len(activities)}")
    
    # === 7. Export Data ===
    print("\n💾 Step 7: Exporting Data")
    print("-" * 40)
    
    exported_data = collaboration_manager.export_collaboration_data()
    
    # Save to file
    export_file = Path(__file__).parent / "collaboration_test_export.json"
    with open(export_file, 'w') as f:
        json.dump(exported_data, f, indent=2, default=str)
    
    print(f"✅ Exported data to: {export_file.name}")
    print(f"   • Users: {len(exported_data.get('users', {}))}")
    print(f"   • Teams: {len(exported_data.get('teams', {}))}")
    print(f"   • Permissions: {len(exported_data.get('permissions', {}))}")
    print(f"   • Comments: {len(exported_data.get('comments', {}))}")
    print(f"   • Annotations: {len(exported_data.get('annotations', {}))}")
    
    print("\n" + "="*80)
    print("🎉 COLLABORATION TEST COMPLETED SUCCESSFULLY!")
    print("="*80)
    
    return {
        "users": 2,
        "teams": 1,
        "permissions": len(permissions),
        "comments": len(comments),
        "annotations": len(annotations),
        "activities": len(activities)
    }


if __name__ == "__main__":
    try:
        result = test_collaboration_features()
        print(f"\n✅ Test results: {result}")
        
    except Exception as e:
        print(f"\n❌ Error running collaboration test: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)