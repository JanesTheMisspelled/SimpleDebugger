import React, { useState, useEffect } from 'react';
import { create } from 'jsondiffpatch';
import type { Delta } from 'jsondiffpatch';
import type { DebugContext } from '../types';
import '../App.css';

// Setup diff patcher
const diffPatcher = create({});

interface StepDebuggerProps {
    context: DebugContext;
    preData?: DebugContext;
    onSubmit?: (data: any) => void;
    readOnly?: boolean;
}

export const StepDebugger: React.FC<StepDebuggerProps> = ({ context, preData, onSubmit, readOnly = false }) => {
    const [editJson, setEditJson] = useState<string>('');
    const [jsonError, setJsonError] = useState<string | null>(null);

    // Initialize editJson when context changes
    useEffect(() => {
        setEditJson(JSON.stringify(context.data, null, 2));
    }, [context]);

    const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditJson(e.target.value);
        try {
            JSON.parse(e.target.value);
            setJsonError(null);
        } catch (err: any) {
            setJsonError(err.message);
        }
    };

    const handleSubmit = () => {
        if (jsonError || !onSubmit) return;
        try {
            const data = JSON.parse(editJson);
            onSubmit(data);
        } catch (e) {
            alert("Failed to parse JSON");
        }
    };

    const isPost = context.metadata.type === 'Post';

    // Calculate Diff if Post
    let diff: Delta | undefined;
    if (isPost && preData) {
        try {
            const currentData = JSON.parse(editJson || '{}');
            diff = diffPatcher.diff(preData.data, currentData);
        } catch { }
    }

    return (
        <div className="container full-width" style={{ height: '100%' }}>
            <header className="header">
                <h2>Debugger: {context.metadata.stepName} <span className={`badge ${context.metadata.type}`}>{context.metadata.type}</span></h2>
                {!readOnly && (
                    <button className="btn-primary" disabled={!!jsonError} onClick={handleSubmit}>
                        Send & Continue
                    </button>
                )}
            </header>

            <div className="info-bar">
                <div className="info-group">
                    <span className="info-label">Run ID:</span>
                    <span className="info-value">{context.metadata.runId}</span>
                </div>
                <div className="info-group">
                    <span className="info-label">Config:</span>
                    <span className="info-value">{context.metadata.configName}</span>
                </div>
                <div className="info-group">
                    <span className="info-label">Resource:</span>
                    <span className="info-value">{context.metadata.configResource}</span>
                </div>
                <div className="info-group">
                    <span className="info-label">ActOn:</span>
                    <span className="info-value">{context.metadata.actOnResource}</span>
                </div>
            </div>

            <div className="workspace">
                {isPost && preData && (
                    <div className="column">
                        <h3>Pre-Step (Result)</h3>
                        <div className="scroll-area">
                            <pre className="json-view">{JSON.stringify(preData.data, null, 2)}</pre>
                        </div>
                    </div>
                )}

                <div className="column main">
                    <h3>{isPost ? 'Post-Step (Editable)' : 'Data (Editable)'}</h3>
                    <textarea
                        className={`json-editor ${jsonError ? 'error' : ''}`}
                        value={editJson}
                        onChange={handleJsonChange}
                        spellCheck={false}
                        readOnly={readOnly}
                    />
                    {jsonError && <div className="error-msg">{jsonError}</div>}
                </div>

                {isPost && (
                    <div className="column">
                        <h3>Diff (Delta)</h3>
                        <div className="scroll-area">
                            <pre className="json-view">{JSON.stringify(diff, null, 2)}</pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
