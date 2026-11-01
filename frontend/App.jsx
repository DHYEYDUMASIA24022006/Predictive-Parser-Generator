import { useState, useCallback } from 'react';
import Pipeline from './components/Pipeline.jsx';
import GrammarEditor from './components/GrammarEditor.jsx';
import FirstFollowTable from './components/FirstFollowTable.jsx';
import ParsingTableView from './components/ParsingTableView.jsx';
import ParserSteps from './components/ParserSteps.jsx';
import ParseTreeView from './components/ParseTreeView.jsx';

import { parseGrammar } from '../backend/grammarParser.js';
import { computeFirst } from '../backend/first.js';
import { computeFollow } from '../backend/follow.js';
import { buildParsingTable } from '../backend/parsingTable.js';
import { runPredictiveParser } from '../backend/predictiveParser.js';
import { tokenize } from '../backend/tokenizer.js';
import { exampleGrammars } from './data/exampleGrammars.js';
import { eliminateLeftRecursion, applyLeftFactoring } from '../backend/transformations.js';

const TABS = [
  { id: 0, label: 'Grammar', icon: '📝' },
  { id: 1, label: 'FIRST & FOLLOW', icon: '🔢' },
  { id: 2, label: 'Parsing Table', icon: '📊' },
  { id: 3, label: 'Parser', icon: '⚙️' },
  { id: 4, label: 'Parse Tree', icon: '🌳' },
];

const DEFAULT_GRAMMAR = exampleGrammars[0].grammar;
const DEFAULT_INPUT = exampleGrammars[0].input;

const App = () => {
  const [activeTab, setActiveTab] = useState(0);

  // Grammar state
  const [grammarText, setGrammarText] = useState(DEFAULT_GRAMMAR);
  const [originalGrammar, setOriginalGrammar] = useState(null);
  const [grammar, setGrammar] = useState(null);
  const [revisedGrammarText, setRevisedGrammarText] = useState(null);
  const [transformations, setTransformations] = useState([]);
  const [grammarErrors, setGrammarErrors] = useState([]);

  // Computed state
  const [firstSets, setFirstSets] = useState(null);
  const [followSets, setFollowSets] = useState(null);
  const [parsingTable, setParsingTable] = useState(null);

  // Parser state
  const [inputString, setInputString] = useState(DEFAULT_INPUT);
  const [parseResult, setParseResult] = useState(null);

  /** User edits the grammar input box */
  const handleGrammarChange = useCallback((newText) => {
    setGrammarText(newText);
    if (revisedGrammarText) {
      setRevisedGrammarText(null);
      setTransformations([]);
    }
  }, [revisedGrammarText]);

  /** Parse grammar and compute all sets + table */
  const handleParseGrammar = useCallback(() => {
    setRevisedGrammarText(null);
    setTransformations([]);

    const result = parseGrammar(grammarText);
    setGrammarErrors(result.errors);

    if (!result.grammar) {
      setOriginalGrammar(null);
      setGrammar(null);
      setFirstSets(null);
      setFollowSets(null);
      setParsingTable(null);
      setParseResult(null);
      return;
    }

    const g = result.grammar;
    setOriginalGrammar(g);
    setGrammar(g);

    const first = computeFirst(g);
    setFirstSets(first);

    const follow = computeFollow(g, first);
    setFollowSets(follow);

    const table = buildParsingTable(g, first, follow);
    setParsingTable(table);

    // Reset parse result when grammar changes
    setParseResult(null);
  }, [grammarText]);

  /** Run the predictive parser on current input */
  const handleRunParser = useCallback(() => {
    if (!grammar || !parsingTable) return;
    const tokens = tokenize(inputString, grammar.terminals);
    const result = runPredictiveParser(grammar, parsingTable, tokens);
    setParseResult(result);
    // Auto-navigate to Parser tab
    setActiveTab(3);
  }, [grammar, parsingTable, inputString]);

  /** Eliminate Left Recursion automatically without overwriting the input box */
  const handleEliminateLR = useCallback(() => {
    const sourceText = revisedGrammarText || grammarText;
    const result = eliminateLeftRecursion(sourceText);
    if (result.transformed) {
      // Retain original in input box! Do NOT overwrite grammarText
      setRevisedGrammarText(result.text);
      setTransformations(prev => [
        ...prev.filter(t => t.type !== 'eliminate_lr'),
        { type: 'eliminate_lr', label: 'Left Recursion Eliminated', changes: result.changes },
      ]);

      if (!originalGrammar) {
        const origRes = parseGrammar(grammarText);
        if (origRes.grammar) setOriginalGrammar(origRes.grammar);
      }

      const parseRes = parseGrammar(result.text);
      setGrammarErrors(parseRes.errors);
      if (parseRes.grammar) {
        setGrammar(parseRes.grammar);
        const first = computeFirst(parseRes.grammar);
        setFirstSets(first);
        const follow = computeFollow(parseRes.grammar, first);
        setFollowSets(follow);
        const table = buildParsingTable(parseRes.grammar, first, follow);
        setParsingTable(table);
        setParseResult(null);
      }
    }
    return result;
  }, [grammarText, revisedGrammarText, originalGrammar]);

  /** Apply Left Factoring automatically without overwriting the input box */
  const handleLeftFactor = useCallback(() => {
    const sourceText = revisedGrammarText || grammarText;
    const result = applyLeftFactoring(sourceText);
    if (result.transformed) {
      // Retain original in input box! Do NOT overwrite grammarText
      setRevisedGrammarText(result.text);
      setTransformations(prev => [
        ...prev.filter(t => t.type !== 'left_factor'),
        { type: 'left_factor', label: 'Left Factored', changes: result.changes },
      ]);

      if (!originalGrammar) {
        const origRes = parseGrammar(grammarText);
        if (origRes.grammar) setOriginalGrammar(origRes.grammar);
      }

      const parseRes = parseGrammar(result.text);
      setGrammarErrors(parseRes.errors);
      if (parseRes.grammar) {
        setGrammar(parseRes.grammar);
        const first = computeFirst(parseRes.grammar);
        setFirstSets(first);
        const follow = computeFollow(parseRes.grammar, first);
        setFollowSets(follow);
        const table = buildParsingTable(parseRes.grammar, first, follow);
        setParsingTable(table);
        setParseResult(null);
      }
    }
    return result;
  }, [grammarText, revisedGrammarText, originalGrammar]);

  /** Revert to original grammar parsing table */
  const handleRevertToOriginal = useCallback(() => {
    setRevisedGrammarText(null);
    setTransformations([]);
    const parseRes = parseGrammar(grammarText);
    setGrammarErrors(parseRes.errors);
    if (parseRes.grammar) {
      setOriginalGrammar(parseRes.grammar);
      setGrammar(parseRes.grammar);
      const first = computeFirst(parseRes.grammar);
      setFirstSets(first);
      const follow = computeFollow(parseRes.grammar, first);
      setFollowSets(follow);
      const table = buildParsingTable(parseRes.grammar, first, follow);
      setParsingTable(table);
      setParseResult(null);
    }
  }, [grammarText]);

  /** Load the revised grammar into the editor input box */
  const handleApplyRevisedToEditor = useCallback(() => {
    if (!revisedGrammarText) return;
    setGrammarText(revisedGrammarText);
    setRevisedGrammarText(null);
    setTransformations([]);
  }, [revisedGrammarText]);

  const grammarReady = grammar !== null;

  return (
    <>
      {/* Header */}
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-logo">
            <div className="logo-icon">⚙</div>
            <span>Predictive Parser Generator</span>
          </div>
          <span className="app-subtitle">LL(1) Compiler Design Tool</span>
          <span style={{ flex: 1 }} />
          {grammarReady && (
            <span className="badge badge-green" style={{ fontSize: '0.78rem' }}>
              ✓ Grammar Ready
            </span>
          )}
        </div>
      </header>

      {/* Pipeline */}
      <Pipeline activeTab={activeTab} grammarReady={grammarReady} />

      {/* Main */}
      <main className="app-main">
        {/* Tab Navigation */}
        <nav className="tab-nav" role="tablist">
          {TABS.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              id={`tab-${tab.id}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>

        {/* Tab Content */}
        <div role="tabpanel">
          {activeTab === 0 && (
            <GrammarEditor
              grammarText={grammarText}
              onGrammarChange={handleGrammarChange}
              grammar={originalGrammar || grammar}
              revisedGrammarText={revisedGrammarText}
              errors={grammarErrors}
              onParse={handleParseGrammar}
              onEliminateLR={handleEliminateLR}
              onLeftFactor={handleLeftFactor}
              onNavigateToParsingTable={() => setActiveTab(2)}
            />
          )}
          {activeTab === 1 && (
            <FirstFollowTable
              grammar={grammar}
              firstSets={firstSets}
              followSets={followSets}
            />
          )}
          {activeTab === 2 && (
            <ParsingTableView
              grammar={grammar}
              table={parsingTable}
              firstSets={firstSets}
              followSets={followSets}
              revisedGrammarText={revisedGrammarText}
              transformations={transformations}
              onEliminateLR={handleEliminateLR}
              onLeftFactor={handleLeftFactor}
              onRevertOriginal={handleRevertToOriginal}
              onApplyRevisedToEditor={handleApplyRevisedToEditor}
            />
          )}
          {activeTab === 3 && (
            <ParserSteps
              grammar={grammar}
              table={parsingTable}
              inputString={inputString}
              onInputChange={setInputString}
              parseResult={parseResult}
              onRunParser={handleRunParser}
            />
          )}
          {activeTab === 4 && (
            <ParseTreeView
              parseResult={parseResult}
              grammar={grammar}
            />
          )}
        </div>
      </main>
    </>
  );
};

export default App;
