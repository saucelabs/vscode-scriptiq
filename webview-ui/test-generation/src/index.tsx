import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
