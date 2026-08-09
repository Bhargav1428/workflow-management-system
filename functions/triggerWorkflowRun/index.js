import {
  createClient,
  createCustomClient,
  withAdminSession
} from '@nhost/nhost-js'

const nhost = createCustomClient({
  subdomain: process.env.NHOST_SUBDOMAIN,
  region: process.env.NHOST_REGION,
  chainFunctions: [
    withAdminSession({
      adminSecret: process.env.NHOST_ADMIN_SECRET
    })
  ]
})

export default async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        message: 'Only POST requests are allowed'
      })
    }

    const { workflow_id } = req.body || {}

    if (!workflow_id) {
      return res.status(400).json({
        success: false,
        message: 'workflow_id is required'
      })
    }

    // 1. Get workflow
    const workflowQuery = `
      query GetWorkflow($id: uuid!) {
        workflows(
          where: { id: { _eq: $id } }
          limit: 1
        ) {
          id
          org_id
          name
          description
          steps(order_by: { position: asc }) {
            id
            position
            type
            config
          }
        }
      }
    `

    const workflowResponse = await nhost.graphql.request({
      query: workflowQuery,
      variables: { id: workflow_id }
    })

    const workflow =
      workflowResponse.body?.data?.workflows?.[0]

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found'
      })
    }

    // 2. Check organization quota
    const orgQuery = `
      query GetOrganization($id: uuid!) {
        organizations(
          where: { id: { _eq: $id } }
          limit: 1
        ) {
          id
          calls_used
          calls_allowed
        }
      }
    `

    const orgResponse = await nhost.graphql.request({
      query: orgQuery,
      variables: { id: workflow.org_id }
    })

    const org =
      orgResponse.body?.data?.organizations?.[0]

    if (!org) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      })
    }

    if (org.calls_used >= org.calls_allowed) {
      return res.status(429).json({
        success: false,
        message: 'Organization quota exhausted'
      })
    }

    // 3. Create workflow run
    const runMutation = `
      mutation CreateRun($workflowId: uuid!) {
        insert_workflow_runs_one(
          object: {
            workflow_id: $workflowId
            status: "running"
            completed_at: null
            error: ""
          }
        ) {
          id
          workflow_id
          status
          started_at
          completed_at
          error
        }
      }
    `

    const runResponse = await nhost.graphql.request({
      query: runMutation,
      variables: {
        workflowId: workflow_id
      }
    })

    const run =
      runResponse.body?.data?.insert_workflow_runs_one

    if (!run) {
      throw new Error(
        'Failed to create workflow run'
      )
    }

    // 4. Get first workflow step
    const firstStep = workflow.steps?.[0]

    if (!firstStep) {
      return res.status(400).json({
        success: false,
        message: 'Workflow has no steps'
      })
    }

    // Your database currently requires these fields.
    const approvedBy =
      'a2b8678d-7ee6-4980-a3a5-e6b7e7890b45'

    const approvedAt = run.started_at

    // 5. Create step run
    const stepRunMutation = `
      mutation CreateStepRun(
        $workflowRunId: uuid!
        $workflowStepId: uuid!
        $approvedBy: uuid!
        $approvedAt: timestamptz!
      ) {
        insert_step_runs_one(
          object: {
            workflow_run_id: $workflowRunId
            workflow_step_id: $workflowStepId
            status: "running"
            input: {}
            output: {}
            error: ""
            attempt_count: 1
            approved_by: $approvedBy
            approved_at: $approvedAt
          }
        ) {
          id
          workflow_run_id
          workflow_step_id
          status
          input
          output
          error
          attempt_count
          approved_by
          approved_at
        }
      }
    `

    const stepRunResponse =
      await nhost.graphql.request({
        query: stepRunMutation,
        variables: {
          workflowRunId: run.id,
          workflowStepId: firstStep.id,
          approvedBy,
          approvedAt
        }
      })

    const stepRun =
      stepRunResponse.body?.data?.insert_step_runs_one

    if (!stepRun) {
      throw new Error(
        'Workflow run created but step run creation failed'
      )
    }

    // 6. Return result
    return res.status(200).json({
      success: true,
      message: 'Workflow run started',
      workflow_run_id: run.id,
      step_run_id: stepRun.id,
      workflow: workflow,
      run: run,
      step_run: stepRun
    })

  } catch (error) {
    console.error(error)

    return res.status(500).json({
      success: false,
      message: 'Workflow execution failed',
      error: error.message
    })
  }
}