import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Config
const configPath = path.join(__dirname, 'config.json');
let config = { port: 3001 };

try {
    if (fs.existsSync(configPath)) {
        const raw = fs.readFileSync(configPath, 'utf-8');
        config = JSON.parse(raw);
    }
} catch (e) {
    console.error("Failed to load config.json, using defaults.", e);
}

const app = express();
const PORT = config.port;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

interface DebugRequest {
    metadata: {
        runId: string;
        stepName: string;
        configName: string;
        configResource: string;
        actOnResource: string;
        type: 'Pre' | 'Post';
    };
    data: any;
}

// Store for the currently pending client request
let pendingClientRes: express.Response | null = null;
let currentContext: DebugRequest | null = null;

// Store history
// Map<runId, RunData>
interface StepRecord {
    stepName: string;
    configResource: string;
    pre?: DebugRequest; // The data sent BACK to client (modified)
    post?: DebugRequest; // The data RECEIVED from client
    postModified?: any; // The data SENT BACK to client (modified)
    order: number;
}

interface RunData {
    steps: StepRecord[];
    status: 'In Progress' | 'Completed' | 'Failed';
    failReason?: string;
    lastActivity: string;
}

const runHistory = new Map<string, RunData>();

// Helper to get or create run history
const getRunHistory = (runId: string) => {
    if (!runHistory.has(runId)) {
        runHistory.set(runId, {
            steps: [],
            status: 'In Progress',
            lastActivity: new Date().toISOString()
        });
    }
    return runHistory.get(runId)!;
};

// 1. Client App calls this to pause and wait for user input
app.post('/api/debug/wait', (req, res) => {
    const debugReq = req.body as DebugRequest;
    
    // Ensure run exists and update activity
    const run = getRunHistory(debugReq.metadata.runId);
    run.lastActivity = new Date().toISOString();

    if (pendingClientRes) {
        console.warn("New request came while waiting for user input on previous request. Overwriting.");
        pendingClientRes.status(409).send({ error: "Interrupted by new request" });
    }

    console.log(`Received ${debugReq.metadata.type} request for step ${debugReq.metadata.stepName}`);

    currentContext = debugReq;
    pendingClientRes = res;
});

// 2. UI calls this to see if there is something to debug
app.get('/api/ui/status', (req, res) => {
    if (!currentContext) {
        return res.json({ status: 'idle' });
    }

    let preContext = null;
    // Find the Pre record for this step if it exists
    const run = runHistory.get(currentContext.metadata.runId);
    if (run) {
        const step = run.steps.find(s => s.stepName === currentContext!.metadata.stepName);
        if (step && step.pre) {
            preContext = step.pre;
        }
    }

    res.json({
        status: 'waiting_for_user',
        context: currentContext,
        preData: preContext
    });
});

// 3. UI submits the modified data
app.post('/api/ui/submit', (req, res) => {
    if (!pendingClientRes || !currentContext) {
        return res.status(400).json({ error: "No pending client request" });
    }

    const modifiedData = req.body.data;
    const meta = currentContext.metadata;
    const run = getRunHistory(meta.runId);
    run.lastActivity = new Date().toISOString();

    let step = run.steps.find(s => s.stepName === meta.stepName);
    if (!step) {
        step = {
            stepName: meta.stepName,
            configResource: meta.configResource,
            order: run.steps.length + 1
        };
        run.steps.push(step);
    }

    if (meta.type === 'Pre') {
        // Save the Modified Pre Data
        step.pre = { ...currentContext, data: modifiedData };
    } else {
        // Save the Original Post Data (what we received) AND the Modified Result
        step.post = currentContext;
        step.postModified = modifiedData;
    }

    // Send response back to the blocked Client App
    pendingClientRes.json({
        data: modifiedData
    });

    // Clear state
    pendingClientRes = null;
    currentContext = null;

    res.json({ success: true });
});

// 4. Get list of runs
app.get('/api/runs', (req, res) => {
    const runs = Array.from(runHistory.entries()).map(([runId, data]) => {
        return {
            runId,
            stepCount: data.steps.length,
            status: data.status,
            failReason: data.failReason,
            lastActivity: data.lastActivity
        };
    });
    // Sort by newest
    runs.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
    res.json(runs);
});

// 5. Get history for a run
app.get('/api/runs/:runId', (req, res) => {
    const { runId } = req.params;
    const run = runHistory.get(runId);
    if (!run) return res.status(404).json({ error: "Run not found" });
    res.json({
        ...run,
        steps: run.steps.sort((a, b) => a.order - b.order)
    });
});

// 6. Delete a run
app.delete('/api/runs/:runId', (req, res) => {
    const { runId } = req.params;
    if (runHistory.delete(runId)) {
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "Run not found" });
    }
});

// 7. Update run status
app.patch('/api/runs/:runId', (req, res) => {
    const { runId } = req.params;
    const { status, failReason } = req.body;
    
    const run = runHistory.get(runId);
    if (!run) return res.status(404).json({ error: "Run not found" });
    
    if (status) run.status = status;
    if (failReason !== undefined) run.failReason = failReason;
    run.lastActivity = new Date().toISOString();
    
    res.json({ success: true, run });
});

app.listen(PORT, () => {
    console.log(`Debug Server running on http://localhost:${PORT}`);
});
