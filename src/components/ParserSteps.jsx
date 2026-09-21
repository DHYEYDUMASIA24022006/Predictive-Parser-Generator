import React, { useState, useEffect, useRef } from 'react';
import { END_MARKER } from '../constants.js';
import { tokenize } from '../parser/tokenizer.js';

function getActionClass(action, isError, isAccept) {
  if (isError) return 'action-error';
  if (isAccept) return 'action-accept';
  if (action.startsWith('Match')) return 'action-match';
  return 'action-expand';
}

function StackDisplay({ stack, grammar }) {
  return (
    <div className="stack-display">
      {stack.map((sym, i) => {
        const isTop = i === stack.length - 1;
        const isEnd = sym === END_MARKER;
        const isNT = grammar.nonTerminals.has(sym);
        return (
          <span
            key={i}
            className={`stack-symbol ${isEnd ? 'end' : isNT ? 'nt' : 'term'} ${isTop ? 'top' : ''}`}
            title={isTop ? 'Stack top' : undefined}
          >
            {sym}
          </span>
        );
      })}
    </div>
  );
}

function InputDisplay({ tokens }) {
  return (
    <div className="token-stream">
      {tokens.map((tok, i) => (
        <span
          key={i}
          className={`token-chip ${tok === END_MARKER ? 'end' : i === 0 ? 'current' : ''}`}
        >
          {tok}
        </span>
      ))}
    </div>
  );
}

const ParserSteps = ({
  grammar, table, inputString, onInputChange, parseResult, onRunParser
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const autoPlayRef = useRef(null);
  const activeRowRef = useRef(null);

  const steps = parseResult?.steps ?? [];
  const totalSteps = steps.length;

  useEffect(() => {
    setCurrentStep(0);
    setAutoPlay(false);
  }, [parseResult]);

  useEffect(() => {
    if (autoPlay) {
      autoPlayRef.current = setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= totalSteps - 1) {
            setAutoPlay(false);
            return prev;
          }
          return prev + 1;
        });
      }, 600);
    } else {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    }
    return () => { if (autoPlayRef.current) clearInterval(autoPlayRef.current); };
  }, [autoPlay, totalSteps]);

  useEffect(() => {
    if (activeRowRef.current) {
      activeRowRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [currentStep]);

  const tokens = tokenize(inputString);

  const currentStepData = steps[currentStep];

  return (
    <div className="section fade-in">
      {/* Input String Configuration */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title"><span className="icon">⌨️</span> Input String</h2>
          <button
            className="btn btn-primary"
            onClick={onRunParser}
            disabled={!grammar || !table}
          >
            ▶ Run Parser
          </button>
        </div>
        <div>
          <label className="input-label">Enter input tokens (space-separated, $ will be appended automatically)</label>
          <input
            className="input-string-field"
            value={inputString}
            onChange={e => onInputChange(e.target.value)}
            placeholder="id + id * id"
            spellCheck={false}
          />
        </div>
        {/* Token stream preview */}
        <div style={{ marginTop: '0.75rem' }}>
          <div className="input-label" style={{ marginBottom: '0.4rem' }}>Token Stream</div>
          <div className="token-stream">
            {tokens.map((tok, i) => (
              <React.Fragment key={i}>
                <span className={`token-chip ${tok === END_MARKER ? 'end' : ''}`}>{tok}</span>
                {i < tokens.length - 1 && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>|</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Parse error / success banner */}
      {parseResult && (
        <div className={`alert ${parseResult.accepted ? 'alert-success' : 'alert-error'}`}>
          <span className="alert-icon">{parseResult.accepted ? '✅' : '❌'}</span>
          <div className="alert-content">
            <div className="alert-title">
              {parseResult.accepted ? 'Input Accepted' : 'Parse Error'}
            </div>
            {parseResult.error && <div className="alert-body">{parseResult.error}</div>}
          </div>
        </div>
      )}

      {/* Step Controls */}
      {steps.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title"><span className="icon">⚙️</span> Parsing Steps</h2>
            <div className="step-controls">
              <button className="btn btn-secondary btn-sm" onClick={() => { setCurrentStep(0); setAutoPlay(false); }}>
                ⏮ Reset
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
                disabled={currentStep === 0}
              >
                ← Prev
              </button>
              <span className="step-progress">Step {currentStep + 1} / {totalSteps}</span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentStep(s => Math.min(totalSteps - 1, s + 1))}
                disabled={currentStep >= totalSteps - 1}
              >
                Next →
              </button>
              <button
                className={`btn btn-sm ${autoPlay ? 'btn-danger' : 'btn-green'}`}
                onClick={() => setAutoPlay(v => !v)}
                disabled={currentStep >= totalSteps - 1}
              >
                {autoPlay ? '⏸ Pause' : '▶ Auto Play'}
              </button>
            </div>
          </div>

          {/* Current step highlight */}
          {currentStepData && (
            <div className={`alert ${currentStepData.isError ? 'alert-error' : currentStepData.isAccept ? 'alert-success' : 'alert-info'}`}
              style={{ marginBottom: '1rem' }}>
              <span className="alert-icon">
                {currentStepData.isError ? '❌' : currentStepData.isAccept ? '✅' : '→'}
              </span>
              <div className="alert-content">
                <div className="alert-title">Step {currentStepData.step}: {currentStepData.action}</div>
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'inherit', opacity: 0.7, marginBottom: '0.2rem' }}>STACK</div>
                    <StackDisplay stack={currentStepData.stack} grammar={grammar} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'inherit', opacity: 0.7, marginBottom: '0.2rem' }}>INPUT</div>
                    <InputDisplay tokens={currentStepData.input} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Full steps table */}
          <div className="table-wrapper scrollable-table">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>Step</th>
                  <th>Stack (top →)</th>
                  <th>Input</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {steps.map((step, i) => (
                  <tr
                    key={step.step}
                    ref={i === currentStep ? activeRowRef : undefined}
                    className={`step-row ${i === currentStep ? 'active-row' : ''} ${step.isError ? 'error-row' : ''} ${step.isAccept ? 'accept-row' : ''}`}
                    onClick={() => setCurrentStep(i)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ color: 'var(--text-muted)', textAlign: 'center' }}>{step.step}</td>
                    <td>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', display: 'flex', flexWrap: 'wrap', gap: '0.2rem' }}>
                        {step.stack.map((sym, j) => (
                          <span key={j} style={{
                            color: sym === END_MARKER ? 'var(--yellow)' :
                              grammar.nonTerminals.has(sym) ? 'var(--accent)' : 'var(--orange)',
                            marginRight: j < step.stack.length - 1 ? '2px' : 0,
                          }}>
                            {sym}{j < step.stack.length - 1 && ' '}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', display: 'flex', flexWrap: 'wrap', gap: '0.2rem' }}>
                        {step.input.map((tok, j) => (
                          <span key={j} style={{
                            color: tok === END_MARKER ? 'var(--yellow)' :
                              j === 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                          }}>
                            {tok}{j < step.input.length - 1 && ' '}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={getActionClass(step.action, step.isError, step.isAccept)}>
                        {step.action}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!parseResult && (
        <div className="empty-state">
          <div className="empty-icon">⚙️</div>
          <div className="empty-title">Parser not run yet</div>
          <div className="empty-sub">Enter an input string and click "Run Parser".</div>
        </div>
      )}
    </div>
  );
};

export default ParserSteps;
