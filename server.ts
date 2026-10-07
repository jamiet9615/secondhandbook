import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON 解析中介軟體
  app.use(express.json({ limit: '10mb' }));
  app.use(express.text({ type: ['text/*', 'application/json'] }));

  // 健康檢查端點
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // =========================================================================
  // GAS 專用代理伺服端端點：徹底解決瀏覽器跨域 CORS / 302 重定向 / 登入頁面解析
  // =========================================================================
  app.get('/api/gas-proxy', async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).json({ status: 'error', message: '缺少 url 參數' });
    }

    try {
      // 伺服端 Node 原生 fetch，無瀏覽器 CORS 限制，自動跟隨 302 重定向
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'CampusBookTradePlatform/1.0',
        },
        redirect: 'follow',
      });

      const text = await response.text();
      const trimmed = text.trim();

      // 檢查是否為合法 JSON
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed);
          return res.json({ status: 'success', data: parsed });
        } catch {
          // 若 JSON 解析失敗則往後進入錯誤診斷
        }
      }

      // 檢驗是否回傳了 Google 帳號登入頁面（表示權限未設為「所有人」）
      if (
        text.includes('accounts.google.com') ||
        text.includes('ServiceLogin') ||
        text.includes('Google 帳戶') ||
        text.includes('Sign in - Google Accounts')
      ) {
        return res.status(200).json({
          status: 'error',
          errorType: 'AUTH_REQUIRED',
          message: 'Apps Script 尚未設定為「所有人 (Anyone)」皆可存取，Google 導向了登入驗證頁面。請至 Apps Script 部署設定修改權限。',
        });
      }

      // 檢驗是否為 Google Apps Script 執行階段拋錯（例如找不到試算表、null.getDataRange()）
      if (text.includes('TypeError:') || text.includes('Exception:') || text.includes('Error:')) {
        let extractedError = '';
        const match = text.match(/<div[^>]*>([^<]*(?:TypeError|Exception|Error)[^<]*)<\/div>/i) ||
                      text.match(/(?:TypeError|Exception|Error):[^<]+/i);
        if (match && match[1]) {
          extractedError = match[1].replace(/&#39;/g, "'").trim();
        } else if (match && match[0]) {
          extractedError = match[0].replace(/&#39;/g, "'").trim();
        }

        return res.status(200).json({
          status: 'error',
          errorType: 'GAS_RUNTIME_ERROR',
          message: extractedError || 'Google Apps Script 後端執行失敗',
          rawError: extractedError,
        });
      }

      // 一般未識別非 JSON 回應
      return res.status(200).json({
        status: 'error',
        errorType: 'INVALID_RESPONSE',
        message: 'Google Apps Script 回傳了非 JSON 格式內容',
        preview: trimmed.slice(0, 200),
      });

    } catch (err: any) {
      console.error('伺服端代理 GAS 請求失敗:', err);
      return res.status(500).json({
        status: 'error',
        errorType: 'FETCH_FAILED',
        message: `伺服端連線 Apps Script 失敗: ${err.message || String(err)}`,
      });
    }
  });

  // POST 代理（供上架、預訂或刪除）
  app.post('/api/gas-proxy', async (req, res) => {
    const targetUrl = (req.query.url as string) || req.body?.targetUrl;
    const payload = req.body?.payload || req.body;

    if (!targetUrl) {
      return res.status(400).json({ status: 'error', message: '缺少 targetUrl 參數' });
    }

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: typeof payload === 'string' ? payload : JSON.stringify(payload),
        redirect: 'follow',
      });

      const text = await response.text();
      try {
        const json = JSON.parse(text);
        return res.json({ status: 'success', data: json });
      } catch {
        return res.json({ status: 'success', text });
      }
    } catch (err: any) {
      console.error('伺服端 POST 代理失敗:', err);
      return res.status(500).json({
        status: 'error',
        message: `伺服端發送資料至 Apps Script 失敗: ${err.message || String(err)}`,
      });
    }
  });

  // =========================================================================
  // Vite 整合（開發環境使用中介軟體，生產環境提供 dist/ 靜態資源）
  // =========================================================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
