import React from 'react';
import ReactDOM from 'react-dom/client';

// Simple test component to verify React is working
const TestApp = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>🎉 React is Working!</h1>
      <p>If you see this, React is rendering correctly.</p>
      <button onClick={() => alert('React event handling works!')}>
        Test Click
      </button>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  document.body.innerHTML = '<h1>Error: Root element not found!</h1>';
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<TestApp />);
    console.log('✅ React app rendered successfully!');
  } catch (error) {
    console.error('❌ React rendering failed:', error);
  const msg = error instanceof Error ? error.message : String(error);
  document.body.innerHTML = '<h1>React Error: ' + msg + '</h1>';
  }
}