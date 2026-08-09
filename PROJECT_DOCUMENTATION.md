# Project Documentation

## Workflow Management System

### Objective

The project implements a workflow management backend with role-based access control and GraphQL APIs.

## Architecture

User
↓
Nhost Authentication
↓
Hasura GraphQL
↓
PostgreSQL Database
↓
Workflow Management

## Database Tables

- organizations
- org_members
- workflows
- workflow_steps
- workflow_triggers
- workflow_runs
- workflow_results

## Workflow Flow

Organization
↓
Workflow
↓
Workflow Trigger
↓
Workflow Step
↓
Workflow Run
↓
Workflow Result

## Roles

### Admin
Full access to the system.

### Owner
Can manage organization workflows.

### Editor
Can access and manage permitted workflow data.

### Viewer
Read-only access to permitted data.

## GraphQL Testing

The following operations were tested successfully:

- SELECT workflows
- INSERT workflow
- UPDATE workflow
- Role-based access
- Workflow trigger creation
- Workflow step creation
- Workflow run creation
- Workflow result creation

## Sample Workflow

Name: Demo Workflow

Description: Test workflow for project submission

Workflow ID:

07329087-9691-44bc-8cd1-2ce67b5615bc

## Sample Workflow Run

Workflow Run ID:

41534095-6c7b-4e3c-8339-4b4965463152

Status:

running

## Sample Result

```json
{
  "status": "success",
  "message": "Workflow executed successfully",
  "step": 1
}
