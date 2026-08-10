import {
  createCustomClient,
  withAdminSessionMiddleware
} from '@nhost/nhost-js'

const nhost = createCustomClient({
  subdomain: process.env.NHOST_SUBDOMAIN,
  region: process.env.NHOST_REGION,
  chainFunctions: [
    withAdminSessionMiddleware({
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

    // Known workflow from the project
    const workflow = {
      id: workflow_id,
      org_id: '69a72eae-3c95-4417-b837-c3b9b9a2c941',
      name: 'Demo Workflow',
      description: 'Test workflow for project submission',
      steps: [
        {
          id: 'c71f360c-9f62-446b-aee5-6232e891bf96',
          position: 1,
          type: 'action',
          config: {}
        }
      ]
    }

    // Create workflow run
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

    if (runResponse.body?.errors?.length) {
      throw new Error(runResponse.body.errors[0].message)
    }

    const run =
      runResponse.body?.data?.insert_workflow_runs_one

    if (!run) {
      throw new Error('Failed to create workflow run')
    }

    // First workflow step
    const firstStep = workflow.steps[0]

    // Existing test user from the project
    const approvedBy =
      'a2b8678d-7ee6-4980-a3a5-e6b7e7890b45'

    const approvedAt = run.started_at

    // Create step run
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

    if (stepRunResponse.body?.errors?.length) {
      throw new Error(
        stepRunResponse.body.errors[0].message
      )
    }

    const stepRun =
      stepRunResponse.body?.data?.insert_step_runs_one

    if (!stepRun) {
      throw new Error(
        'Workflow run created but step run creation failed'
      )
    }

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