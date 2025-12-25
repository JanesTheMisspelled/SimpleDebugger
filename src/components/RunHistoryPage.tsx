import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Mermaid } from './Mermaid';
import { StepDebugger } from './StepDebugger';
import type { RunSummary, StepRecord, RunData } from '../types';

export const RunHistoryPage = () => {
    const [runs, setRuns] = useState<RunSummary[]>([]);
    const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
    const [runData, setRunData] = useState<RunData | null>(null);
    const [selectedStep, setSelectedStep] = useState<StepRecord | null>(null);

    // Fetch Runs
    const fetchRuns = () => {
        axios.get('/api/runs').then(res => setRuns(res.data));
    };

    useEffect(() => {
        fetchRuns();
        const interval = setInterval(fetchRuns, 5000); // Auto refresh list
        return () => clearInterval(interval);
    }, []);

    // Fetch Run Details when Run Selected
    useEffect(() => {
        if (!selectedRunId) return;
        axios.get<RunData>(`/api/runs/${selectedRunId}`).then(res => {
            setRunData(res.data);
            setSelectedStep(null);
        }).catch(() => setSelectedRunId(null));
    }, [selectedRunId]);

    const handleDelete = async (e: React.MouseEvent, runId: string) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this run?')) return;
        await axios.delete(`/api/runs/${runId}`);
        fetchRuns();
        if (selectedRunId === runId) setSelectedRunId(null);
    };

    const handleUpdateStatus = async (status: 'Completed' | 'Failed') => {
        if (!selectedRunId) return;
        let reason = undefined;
        if (status === 'Failed') {
            const input = prompt('Enter failure reason (optional):');
            if (input === null) return; // Cancelled
            reason = input;
        }

        await axios.patch(`/api/runs/${selectedRunId}`, { status, failReason: reason });
        
        // Refresh local data
        axios.get<RunData>(`/api/runs/${selectedRunId}`).then(res => setRunData(res.data));
        fetchRuns();
    };

    const generateMermaidChart = (steps: StepRecord[]) => {
        if (steps.length === 0) return '';
        
        let chart = 'sequenceDiagram\n';
        
        // Helper to sanitize IDs
        const toSafeId = (str: string) => 'id_' + str.replace(/[^a-zA-Z0-9]/g, '_');

        const resources = new Set<string>();
        steps.forEach(s => {
            if (s.configResource) resources.add(s.configResource);
            const meta = s.pre?.metadata || s.post?.metadata;
            if (meta?.actOnResource) resources.add(meta.actOnResource);
        });

        Array.from(resources).forEach(r => {
            chart += `participant ${toSafeId(r)} as ${r}\n`;
        });

        steps.forEach((step, index) => {
            const meta = step.pre?.metadata || step.post?.metadata;
            if (!meta) return;

            const from = toSafeId(step.configResource); 
            const to = toSafeId(meta.actOnResource || 'Unknown');
            
            // Client calls Resource (Pre)
            chart += `${from}->>${to}: ${index + 1}. ${step.stepName}\n`;
        });
        
        return chart;
    };

    if (selectedStep && selectedStep.post) {
        return (
            <div className="history-detail-view">
                <button className="back-btn" onClick={() => setSelectedStep(null)}>← Back to Diagram</button>
                <StepDebugger 
                    context={selectedStep.post} 
                    preData={selectedStep.pre} 
                    readOnly={true} 
                />
            </div>
        );
    }
    
    if (selectedStep && selectedStep.pre && !selectedStep.post) {
         return (
            <div className="history-detail-view">
                <button className="back-btn" onClick={() => setSelectedStep(null)}>← Back to Diagram</button>
                 <StepDebugger 
                    context={selectedStep.pre} 
                    readOnly={true} 
                />
            </div>
        );       
    }

    return (
        <div className="container" style={{ padding: '2rem' }}>
            <h1>Run History</h1>
            
            {!selectedRunId ? (
                <div className="run-list">
                    {runs.map(run => (
                        <div key={run.runId} className="card" onClick={() => setSelectedRunId(run.runId)}>
                            <div className="card-header">
                                <h3>Run: {run.runId}</h3>
                                <button className="btn-danger small" onClick={(e) => handleDelete(e, run.runId)}>🗑</button>
                            </div>
                            <p>Steps: {run.stepCount}</p>
                            <div className="status-row">
                                <span className={`badge ${run.status.replace(' ', '-')}`}>{run.status}</span>
                                <small>{new Date(run.lastActivity).toLocaleString()}</small>
                            </div>
                            {run.failReason && <div className="fail-reason">Reason: {run.failReason}</div>}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="run-view">
                    <div className="run-controls">
                        <button onClick={() => setSelectedRunId(null)}>← Back to Runs</button>
                        <div className="run-actions">
                            {runData?.status === 'In Progress' && (
                                <>
                                    <button className="btn-success" onClick={() => handleUpdateStatus('Completed')}>Mark Completed</button>
                                    <button className="btn-danger" onClick={() => handleUpdateStatus('Failed')}>Mark Failed</button>
                                </>
                            )}
                            <span className={`badge ${runData?.status.replace(' ', '-')}`}>{runData?.status}</span>
                        </div>
                    </div>
                    
                    <h2>Run: {selectedRunId}</h2>
                    {runData?.failReason && <p className="error-text">Failure Reason: {runData.failReason}</p>}
                    
                    <div className="split-view">
                        <div className="diagram-pane">
                            <Mermaid chart={generateMermaidChart(runData?.steps || [])} />
                        </div>
                        <div className="steps-list">
                            <h3>Steps</h3>
                            <ul>
                                {runData?.steps.map((step, idx) => (
                                    <li key={idx} onClick={() => setSelectedStep(step)}>
                                        <strong>{idx + 1}. {step.stepName}</strong>
                                        <br/>
                                        <small>{step.configResource}</small>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};