import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import '@fontsource/noto-sans-devanagari/400.css';
import '@fontsource/noto-sans-devanagari/600.css';
import '@fontsource/noto-sans-devanagari/700.css';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
