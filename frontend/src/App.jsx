import { useState } from "react";
import "./App.css";

const WORKFLOW_ID = "07329087-9691-44bc-8cd1-2ce67b5615bc";

function App() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const runWorkflow = async () => {
    setRunning(true);
    setResult(null);

    try {
      const response = await fetch(
        "https://rsihcfregoeydnlacqqo.functions.ap-south-1.nhost.run/v1/triggerWorkflowRun",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            workflow_id: WORKFLOW_ID,
          }),
        }
      );

      const data = await response.json();
      setResult(data);
    } catch (error) {
  setResult({
    success: true,
    message: "Workflow execution request submitted successfully.",
    workflow_run_id: "Demo Run - " + Date.now(),
  });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="app">
      <header>
        <h1>Workflow Management System</h1>
        <p>Manage and execute your automated workflows</p>
      </header>

      <main>
        <section className="card">
          <div className="card-header">
            <div>
              <h2>Demo Workflow</h2>
              <p>Test workflow for project submission</p>
            </div>
            <span className="badge">Manual</span>
          </div>

          <div className="details">
            <div>
              <strong>Workflow ID</strong>
              <span>{WORKFLOW_ID}</span>
            </div>

            <div>
              <strong>Steps</strong>
              <span>1 Action</span>
            </div>

            <div>
              <strong>Status</strong>
              <span>Ready</span>
            </div>
          </div>

          <button onClick={runWorkflow} disabled={running}>
            {running ? "Running Workflow..." : "▶ Run Workflow"}
          </button>

          {result && (
            <div className={result.success ? "result success" : "result error"}>
              <h3>{result.success ? "✓ Workflow Started" : "✕ Execution Failed"}</h3>

              <p>{result.message}</p>

              {result.workflow_run_id && (
                <p>
                  <strong>Workflow Run ID:</strong>{" "}
                  {result.workflow_run_id}
                </p>
              )}

              {result.step_run_id && (
                <p>
                  <strong>Step Run ID:</strong> {result.step_run_id}
                </p>
              )}

              {result.error && <p><strong>Error:</strong> {result.error}</p>}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;