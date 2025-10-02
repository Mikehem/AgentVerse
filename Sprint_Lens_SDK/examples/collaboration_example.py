#!/usr/bin/env python3
"""
Collaborative Dataset Management Example

This example demonstrates how to use Sprint Lens SDK's collaborative features
for team-based dataset development and management. It covers:

1. Setting up users and teams
2. Creating and managing datasets collaboratively
3. Permission management for datasets
4. Adding comments and annotations
5. Tracking collaboration activities
6. Exporting collaboration data

This script can run independently without backend connection to demonstrate
the core collaboration functionality.
"""

import sys
import json
from datetime import datetime
from pathlib import Path

# Add the SDK to the path for local testing
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

try:
    import sprintlens
    from sprintlens.utils.collaboration import (
        CollaborationManager, PermissionLevel, CommentType, AnnotationType
    )
    from sprintlens.evaluation import EvaluationDataset, DatasetItem
    print("✅ Sprint Lens SDK imported successfully")
except ImportError as e:
    print(f"❌ Failed to import Sprint Lens SDK: {e}")
    sys.exit(1)


def create_sample_dataset():
    """Create a sample dataset for collaboration demonstration."""
    dataset_items = [
        DatasetItem(
            input={"text": "What is machine learning?", "context": "AI basics"},
            expected_output={"answer": "Machine learning is a subset of AI that enables computers to learn from data without explicit programming."},
            metadata={"difficulty": "beginner", "topic": "fundamentals"}
        ),
        DatasetItem(
            input={"text": "Explain neural networks", "context": "Deep learning"},
            expected_output={"answer": "Neural networks are computing systems inspired by biological neural networks, consisting of interconnected nodes that process information."},
            metadata={"difficulty": "intermediate", "topic": "deep_learning"}
        ),
        DatasetItem(
            input={"text": "What are transformers in AI?", "context": "Natural language processing"},
            expected_output={"answer": "Transformers are a type of neural network architecture that uses self-attention mechanisms to process sequential data, particularly effective for language tasks."},
            metadata={"difficulty": "advanced", "topic": "nlp"}
        )
    ]
    
    return EvaluationDataset(
        name="AI Knowledge Dataset",
        description="A collaborative dataset for AI knowledge evaluation",
        items=dataset_items
    )


def demonstrate_team_collaboration():
    """
    Demonstrate a complete team collaboration workflow.
    """
    print("\n" + "="*80)
    print("🤝 SPRINT LENS SDK - COLLABORATIVE DATASET MANAGEMENT DEMO")
    print("="*80)
    
    # Initialize collaboration manager
    collaboration_manager = CollaborationManager()
    
    # === 1. Create Users and Teams ===
    print("\n📋 Step 1: Creating Users and Teams")
    print("-" * 50)
    
    # Create team members
    users = {}
    user_configs = [
        {"username": "alice_data", "email": "alice@company.com", "display_name": "Alice Chen", "role": "admin"},
        {"username": "bob_ml", "email": "bob@company.com", "display_name": "Bob Johnson", "role": "user"},
        {"username": "carol_eng", "email": "carol@company.com", "display_name": "Carol Smith", "role": "user"},
        {"username": "david_lead", "email": "david@company.com", "display_name": "David Kumar", "role": "admin"}
    ]
    
    for config in user_configs:
        user = collaboration_manager.create_user(**config)
        users[config["username"]] = user
        print(f"✅ Created user: {user.display_name} ({user.username}) - {user.role}")
    
    # Create teams
    ml_team = collaboration_manager.create_team(
        name="ML Research Team",
        description="Machine Learning research and dataset development",
        members=[users["alice_data"].id, users["bob_ml"].id],
        owner_id=users["alice_data"].id
    )
    
    data_team = collaboration_manager.create_team(
        name="Data Engineering Team", 
        description="Data infrastructure and pipeline management",
        members=[users["carol_eng"].id, users["david_lead"].id],
        owner_id=users["david_lead"].id
    )
    
    print(f"✅ Created team: {ml_team.name} ({len(ml_team.members)} members)")
    print(f"✅ Created team: {data_team.name} ({len(data_team.members)} members)")
    
    # === 2. Create Sample Dataset ===
    print("\n📊 Step 2: Creating Collaborative Dataset")
    print("-" * 50)
    
    dataset = create_sample_dataset()
    dataset_id = f"dataset_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    print(f"✅ Created dataset: {dataset.name}")
    print(f"   Dataset ID: {dataset_id}")
    print(f"   Items: {len(dataset.items)}")
    
    # === 3. Set Up Permissions ===
    print("\n🔐 Step 3: Managing Dataset Permissions")
    print("-" * 50)
    
    # Grant team permissions
    ml_permission = collaboration_manager.grant_permission(
        resource_id=dataset_id,
        resource_type="dataset",
        subject_id=ml_team.id,
        subject_type="team", 
        permission_level=PermissionLevel.ADMIN,
        granted_by=users["alice_data"].id
    )
    
    data_permission = collaboration_manager.grant_permission(
        resource_id=dataset_id,
        resource_type="dataset",
        subject_id=data_team.id,
        subject_type="team",
        permission_level=PermissionLevel.READ,
        granted_by=users["alice_data"].id
    )
    
    print(f"✅ Granted {ml_permission.permission_level.name} permission to ML Research Team")
    print(f"✅ Granted {data_permission.permission_level.name} permission to Data Engineering Team")
    
    # Grant individual user permission
    bob_permission = collaboration_manager.grant_permission(
        resource_id=dataset_id,
        resource_type="dataset",
        subject_id=users["bob_ml"].id,
        subject_type="user",
        permission_level=PermissionLevel.WRITE,
        granted_by=users["alice_data"].id
    )
    
    print(f"✅ Granted {bob_permission.permission_level.name} permission to Bob Johnson")
    
    # === 4. Add Comments and Discussions ===
    print("\n💬 Step 4: Adding Comments and Discussions")
    print("-" * 50)
    
    # Alice adds initial comment
    initial_comment = collaboration_manager.add_comment(
        resource_id=dataset_id,
        resource_type="dataset",
        content="This dataset looks great! I think we should add more examples for advanced topics like transformers and attention mechanisms.",
        author_id=users["alice_data"].id,
        comment_type=CommentType.SUGGESTION
    )
    print(f"✅ Alice added suggestion: {initial_comment.content[:50]}...")
    
    # Bob replies to Alice's comment
    bob_reply = collaboration_manager.add_comment(
        resource_id=dataset_id,
        resource_type="dataset",
        content="@alice_data I agree! I can work on adding 10 more transformer-related examples. Should we focus on GPT or BERT architectures?",
        author_id=users["bob_ml"].id,
        comment_type=CommentType.QUESTION,
        parent_comment_id=initial_comment.id,
        mentioned_users=[users["alice_data"].id]
    )
    print(f"✅ Bob replied: {bob_reply.content[:50]}...")
    
    # Carol adds a question
    carol_question = collaboration_manager.add_comment(
        resource_id=dataset_id,
        resource_type="dataset", 
        content="From a data engineering perspective, what's the expected size of this dataset when fully populated? We need to plan storage accordingly.",
        author_id=users["carol_eng"].id,
        comment_type=CommentType.QUESTION
    )
    print(f"✅ Carol asked: {carol_question.content[:50]}...")
    
    # David provides technical insight
    david_comment = collaboration_manager.add_comment(
        resource_id=dataset_id,
        resource_type="dataset",
        content="Based on our infrastructure, we can handle up to 100K examples efficiently. Beyond that, we'll need to implement data sharding.",
        author_id=users["david_lead"].id,
        comment_type=CommentType.GENERAL,
        parent_comment_id=carol_question.id
    )
    print(f"✅ David responded: {david_comment.content[:50]}...")
    
    # === 5. Add Field Annotations ===
    print("\n📝 Step 5: Adding Field Annotations")
    print("-" * 50)
    
    # Annotate difficulty field
    difficulty_annotation = collaboration_manager.add_annotation(
        resource_id=dataset_id,
        resource_type="dataset",
        target_field="difficulty",
        content="Consider adding 'expert' level for very advanced topics like attention mechanisms and transformer architectures",
        author_id=users["alice_data"].id,
        annotation_type=AnnotationType.SUGGESTION,
        priority="HIGH"
    )
    print(f"✅ Alice annotated 'difficulty' field: {difficulty_annotation.content[:50]}...")
    
    # Annotate context field
    context_annotation = collaboration_manager.add_annotation(
        resource_id=dataset_id,
        resource_type="dataset",
        target_field="context",
        content="Ensure context field provides sufficient background information for accurate evaluation",
        author_id=users["bob_ml"].id,
        annotation_type=AnnotationType.WARNING,
        priority="MEDIUM"
    )
    print(f"✅ Bob annotated 'context' field: {context_annotation.content[:50]}...")
    
    # Data quality annotation
    quality_annotation = collaboration_manager.add_annotation(
        resource_id=dataset_id,
        resource_type="dataset",
        target_field="expected_output",
        content="All outputs should be validated by domain experts before inclusion",
        author_id=users["david_lead"].id,
        annotation_type=AnnotationType.NOTE,
        priority="HIGH"
    )
    print(f"✅ David annotated 'expected_output' field: {quality_annotation.content[:50]}...")
    
    # === 6. Review Collaboration Activities ===
    print("\n📈 Step 6: Reviewing Collaboration Activities")
    print("-" * 50)
    
    # Get recent activities
    recent_activities = collaboration_manager.get_recent_activities(
        resource_id=dataset_id,
        resource_type="dataset",
        limit=10
    )
    
    print(f"📊 Recent activities ({len(recent_activities)} total):")
    for activity in recent_activities[-5:]:  # Show last 5
        actor_name = next((u.display_name for u in users.values() if u.id == activity.actor_id), "Unknown")
        print(f"   • {activity.activity_type.name}: {actor_name} - {activity.timestamp}")
    
    # Get collaboration summary
    permissions = collaboration_manager.get_resource_permissions(dataset_id, "dataset")
    comments = collaboration_manager.get_comments(dataset_id, "dataset")
    annotations = collaboration_manager.get_annotations(dataset_id, "dataset")
    
    print(f"\n📋 Collaboration Summary:")
    print(f"   • Permissions: {len(permissions)}")
    print(f"   • Comments: {len(comments)}")
    print(f"   • Annotations: {len(annotations)}")
    print(f"   • Activities: {len(recent_activities)}")
    
    # === 7. Export Collaboration Data ===
    print("\n💾 Step 7: Exporting Collaboration Data")
    print("-" * 50)
    
    exported_data = collaboration_manager.export_collaboration_data()
    
    # Save to file
    export_file = Path(__file__).parent / "collaboration_export.json"
    with open(export_file, 'w') as f:
        json.dump(exported_data, f, indent=2, default=str)
    
    print(f"✅ Exported collaboration data to: {export_file}")
    print(f"   • Users: {len(exported_data.get('users', {}))}")
    print(f"   • Teams: {len(exported_data.get('teams', {}))}")
    print(f"   • Permissions: {len(exported_data.get('permissions', {}))}")
    print(f"   • Comments: {len(exported_data.get('comments', {}))}")
    print(f"   • Annotations: {len(exported_data.get('annotations', {}))}")
    print(f"   • Activities: {len(exported_data.get('activities', []))}")
    
    # === 8. Demonstrate Advanced Features ===
    print("\n🔬 Step 8: Advanced Collaboration Features")
    print("-" * 50)
    
    # Resolve annotation
    collaboration_manager.resolve_annotation(difficulty_annotation.id, users["alice_data"].id)
    print(f"✅ Alice resolved the difficulty field annotation")
    
    # Update comment
    collaboration_manager.update_comment(
        bob_reply.id,
        "@alice_data I'll focus on GPT architectures first, then move to BERT. ETA: 2 weeks.",
        users["bob_ml"].id
    )
    print(f"✅ Bob updated their comment with timeline")
    
    # Add team member
    collaboration_manager.add_team_member(ml_team.id, users["carol_eng"].id, users["alice_data"].id)
    print(f"✅ Added Carol to ML Research Team")
    
    # Generate notifications for mentions
    notifications = collaboration_manager.get_user_notifications(users["alice_data"].id)
    print(f"✅ Alice has {len(notifications)} notifications")
    
    print("\n" + "="*80)
    print("🎉 COLLABORATION WORKFLOW COMPLETED SUCCESSFULLY!")
    print("="*80)
    print(f"""
📊 Final Statistics:
   • Users created: {len(users)}
   • Teams created: 2
   • Permissions granted: {len(permissions)}
   • Comments added: {len(comments)}
   • Annotations created: {len(annotations)}
   • Activities logged: {len(recent_activities)}
   
🤝 This demonstrates a complete collaborative dataset development workflow
   including team management, permissions, discussions, and activity tracking.
   
📁 Collaboration data exported to: {export_file}
""")


def demonstrate_dataset_client_integration():
    """
    Demonstrate integration with DatasetClient (simulated).
    
    Note: This simulates DatasetClient usage since we don't have backend connection.
    In a real scenario, these methods would be called on an actual DatasetClient instance.
    """
    print("\n" + "="*80)
    print("🔌 DATASET CLIENT COLLABORATION INTEGRATION")
    print("="*80)
    
    print("""
In a real application with backend connection, you would use DatasetClient like this:

```python
import sprintlens

# Configure client
sprintlens.configure(url="https://your-backend.com", username="user", password="pass")
client = sprintlens.get_client()

# Create users and teams
user_result = client.datasets.create_user(
    username="alice_data",
    email="alice@company.com", 
    display_name="Alice Chen",
    role="admin"
)

team_result = client.datasets.create_team(
    name="ML Research Team",
    description="Machine Learning research team",
    members=[user_result["user"]["id"]]
)

# Grant dataset permissions
permission_result = client.datasets.grant_dataset_permission(
    dataset_id="dataset_123",
    team_id=team_result["team"]["id"],
    permission_level="ADMIN"
)

# Add comments and annotations
comment_result = client.datasets.add_dataset_comment(
    dataset_id="dataset_123",
    content="This dataset looks great!",
    author_id=user_result["user"]["id"],
    comment_type="SUGGESTION"
)

annotation_result = client.datasets.annotate_dataset_field(
    dataset_id="dataset_123",
    field_name="difficulty",
    content="Consider adding expert level",
    author_id=user_result["user"]["id"],
    annotation_type="SUGGESTION"
)

# Get collaboration summary
summary = client.datasets.get_dataset_collaboration_summary("dataset_123")
print("Collaboration summary:", summary)

# Export all collaboration data
export_data = client.datasets.export_collaboration_data()
print("Export completed:", export_data["export_summary"])
```

🔗 All collaboration features are now integrated into the DatasetClient
   and ready for use with the Sprint Lens backend platform.
""")


if __name__ == "__main__":
    try:
        # Run the main collaboration demonstration
        demonstrate_team_collaboration()
        
        # Show DatasetClient integration
        demonstrate_dataset_client_integration()
        
        print("\n✅ All collaboration examples completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Error running collaboration example: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)