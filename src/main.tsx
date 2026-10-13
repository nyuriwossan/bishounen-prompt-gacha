import { render } from 'preact';
import { App } from './ui/App';
import './ui/styles.css';

const root = document.getElementById('app');
if (root) render(<App />, root);

// 一度読み込めば通信が切れても使えるように、同一オリジンの静的ファイルだけをキャッシュする
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* 使えない環境では何もしない */ });
  });
}
