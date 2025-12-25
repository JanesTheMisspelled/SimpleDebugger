import { useState, useEffect } from 'react'
import axios from 'axios'
import type { StatusResponse, DebugContext } from '../types'
import { StepDebugger } from './StepDebugger'

export const LiveDebug = () => {
  const [status, setStatus] = useState<StatusResponse['status']>('idle');
  const [context, setContext] = useState<DebugContext | undefined>();
  const [preData, setPreData] = useState<DebugContext | undefined>();
  
  // Polling
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await axios.get<StatusResponse>('/api/ui/status');
        if (res.data.status === 'waiting_for_user') {
            setContext(prev => {
                if (!prev || 
                    prev.metadata.runId !== res.data.context?.metadata.runId || 
                    prev.metadata.stepName !== res.data.context?.metadata.stepName || 
                    prev.metadata.type !== res.data.context?.metadata.type) {
                     // New context found
                     setPreData(res.data.preData);
                     setStatus('waiting_for_user');
                     return res.data.context;
                }
                return prev;
            });
            if (status === 'idle') setStatus('waiting_for_user');

        } else if (res.data.status === 'idle' && status === 'waiting_for_user') {
          // Task gone
          setStatus('idle');
          setContext(undefined);
          setPreData(undefined);
        }
      } catch (e) {
        console.error("Polling error", e);
      }
    };

    const interval = setInterval(poll, 1000);
    return () => clearInterval(interval);
  }, [status]);

  const handleSubmit = async (data: any) => {
    try {
      await axios.post('/api/ui/submit', { data });
      setStatus('idle');
      setContext(undefined);
    } catch (e) {
      alert("Failed to submit");
    }
  };

  console.log('LiveDebug Render:', { status, context, preData });

  if (status === 'idle') {
    return (
        <div className="container center">
            <h1>Waiting for Client Connection...</h1>
            <p>Make a request to POST /api/debug/wait</p>
        </div>
    )
  }

  if (!context) return <div>Loading...</div>;

  return (
    <StepDebugger 
        context={context} 
        preData={preData} 
        onSubmit={handleSubmit} 
    />
  );
}
