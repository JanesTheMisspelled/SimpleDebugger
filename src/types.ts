export interface DebugMetadata {
    runId: string;
    stepName: string;
    configName: string;
    configResource: string;
    actOnResource: string;
    type: 'Pre' | 'Post';
}

export interface DebugContext {
    metadata: DebugMetadata;
    data: any;
}

export interface StatusResponse {
    status: 'idle' | 'waiting_for_user';
    context?: DebugContext;
    preData?: DebugContext;
}

export interface StepRecord {
    stepName: string;
    configResource: string;
    pre?: DebugContext;
    post?: DebugContext;
    postModified?: any;
    order: number;
}

export interface RunSummary {
    runId: string;
    stepCount: number;
    lastActivity: string;
    status: 'In Progress' | 'Completed' | 'Failed';
    failReason?: string;
}

export interface RunData extends RunSummary {
    steps: StepRecord[];
}