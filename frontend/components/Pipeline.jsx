import React from 'react';

const STEPS = ['Grammar', 'FIRST & FOLLOW', 'LL(1) Table', 'Parser', 'Parse Tree'];
const ICONS = ['📝', '🔢', '📊', '⚙️', '🌳'];

const Pipeline = ({ activeTab, grammarReady }) => {
  const steps = STEPS.map((label, i) => {
    let status;
    if (i === activeTab) status = 'active';
    else if (i < activeTab && grammarReady) status = 'done';
    else status = 'pending';
    return { label, icon: ICONS[i], status };
  });

  return (
    <div className="pipeline-bar">
      <div className="pipeline-inner">
        {steps.map((step, i) => (
          <React.Fragment key={step.label}>
            <div className={`pipeline-step ${step.status}`}>
              <span className="pipeline-dot" />
              <span>{step.icon} {step.label}</span>
            </div>
            {i < steps.length - 1 && (
              <span className="pipeline-arrow">→</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default Pipeline;
