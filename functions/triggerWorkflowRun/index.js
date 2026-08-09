const GRAPHQL_URL = process.env.NHOST_GRAPHQL_URL;
const ADMIN_SECRET = process.env.NHOST_ADMIN_SECRET;

async function graphql(query, variables = {}) {
  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hasura-admin-secret": ADMIN_SECRET
    },
    body: JSON.stringify({ query, variables })
  });

  const data = await response.json();

  if (data.errors) {
    throw new Error(data.errors.map(e => e.message).join(", "));
  }

  return data.data;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        success: false,
        message: "Only POST requests are allowed"
      });
    }

    const { workflow_id } = req.body || {};

    if (!workflow_id) {
      return res.status(400).json({
        success: false,
        message: "workflow_id is required"
      });
    }

    // 1. Verify workflow exists
    const workflowData = await graphql(
      `
        query GetWorkflow($id: uuid!) {
          workflows_by_pk(id: $id) {
            id
            org_id
            name
          }
        }
      `,
      { id: workflow_id }
    );

    const workflow = workflowData.workflows_by_pk;

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: "Workflow not found"
      });
    }

    // 2. Check quota
    const orgData = await graphql(
      `
        query GetOrg($id: uuid!) {
          organizations_by_pk(id: $id) {
            id
            calls_used
            calls_allowed
          }
        }
      `,
      { id: workflow.org_id }
    );

    const org = orgData.organizations_by_pk;

    if (!org) {
      return res.status(404).json({
        success: false,
        message: "Organization not found"
      });
    }

    if (org.calls_used >= org.calls_allowed) {
      return res.status(429).json({
        success: false,
        message: "Organization quota exhausted"
      });
    }

    // 3. Create workflow run
    const runData = await graphql(
      `
        mutation CreateRun($workflowId: uuid!) {
          insert_workflow_runs_one(
            object: {
              workflow_id: $workflowId
              status: "running"
            }
          ) {
            id
            workflow_id
            status
            started_at
          }
        }
      `,
      { workflowId: workflow_id }
    );

    const run = runData.insert_workflow_runs_one;

    // 4. Return execution information
    return res.status(200).json({
      success: true,
      message: "Workflow run started",
      workflow_run_id: run.id,
      workflow: workflow,
      run: run
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Workflow execution failed",
      error: error.message
    });
  }
}