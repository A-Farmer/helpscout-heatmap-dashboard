import React from 'react';
import './app.css';
import HelpscoutHeatmap from './HelpscoutHeatmap';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Support Team Response Dashboard</h1>
      </header>
      <main className="App-main">
        <HelpscoutHeatmap />
      </main>
      <footer className="App-footer">
        <p>&copy; {new Date().getFullYear()} - Support Team Dashboard</p>
      </footer>
    </div>
  );
}

export default App;