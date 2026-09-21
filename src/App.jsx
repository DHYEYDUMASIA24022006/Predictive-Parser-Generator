import { useState, useCallback } from 'react';
import Pipeline from './components/Pipeline.jsx';
import GrammarEditor from './components/GrammarEditor.jsx';
import FirstFollowTable from './components/FirstFollowTable.jsx';
import ParsingTableView from './components/ParsingTableView.jsx';
import ParserSteps from './components/ParserSteps.jsx';
import ParseTreeView from './components/ParseTreeView.jsx';

import { parseGrammar } from './parser/grammarParser.js';
import { computeFirst } from './parser/first.js';
import { computeFollow } from './parser/follow.js';
import { buildParsingTable } from './parser/parsingTable.js';
import { runPredictiveParser } from './parser/predictiveParser.js';
import { tokenize } from './parser/tokenizer.js';
import { exampleGrammars } from './data/exampleGrammars.js';

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
  const [grammar, setGrammar] = useState(null);
  const [grammarErrors, setGrammarErrors] = useState([]);

  // Computed state
  const [firstSets, setFirstSets] = useState(null);
  const [followSets, setFollowSets] = useState(null);
  const [parsingTable, setParsingTable] = useState(null);

  // Parser state
  const [inputString, setInputString] = useState(DEFAULT_INPUT);
  const [parseResult, setParseResult] = useState(null);

  /** Parse grammar and compute all sets + table */
  const handleParseGrammar = useCallback(() => {
    const result = parseGrammar(grammarText);
    setGrammarErrors(result.errors);

    if (!result.grammar) {
      setGrammar(null);
      setFirstSets(null);
      setFollowSets(null);
      setParsingTable(null);
      setParseResult(null);
      return;
    }

    const g = result.grammar;
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
    const tokens = tokenize(inputString);
    const result = runPredictiveParser(grammar, parsingTable, tokens);
    setParseResult(result);
    // Auto-navigate to Parser tab
    setActiveTab(3);
  }, [grammar, parsingTable, inputString]);

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
              onGrammarChange={setGrammarText}
              grammar={grammar}
              errors={grammarErrors}
              onParse={handleParseGrammar}
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
