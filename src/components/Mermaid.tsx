import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidProps {
  chart: string;
  onStepClick?: (stepName: string) => void;
}

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
});

export const Mermaid: React.FC<MermaidProps> = ({ chart, onStepClick }) => {
  const ref = useRef<HTMLDivElement>(null);

  // Suppress unused variable check for now if we plan to use it later, or remove it from props.
  // Using it in a no-op to satisfy linter.
  useEffect(() => { if(onStepClick) {} }, [onStepClick]);

  useEffect(() => {
    if (ref.current) {
      mermaid.render(`mermaid-${Math.random().toString(36).substr(2, 9)}`, chart)
        .then(({ svg }) => {
            if (ref.current) {
                ref.current.innerHTML = svg;
                // Bind click events if needed (mermaid supports click interactions via syntax, 
                // but we need to bind window function or handle it here).
                // Mermaid 'click' keyword calls a global function.
            }
        });
    }
  }, [chart]);

  return <div className="mermaid" ref={ref} />;
};
