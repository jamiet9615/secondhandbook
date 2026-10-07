/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useId } from 'react';
import {
  BookOpen,
  PlusCircle,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  MapPin,
  Tag,
  User,
  Phone,
  MessageSquare,
  AlertCircle,
  ExternalLink,
  Code2,
  Copy,
  Check,
  Settings,
  X,
  BookMarked,
  Sparkles,
  ChevronDown,
  Trash2
} from 'lucide-react';
import { Book, PurchaseRequest, DEFAULT_GAS_URL } from './types.ts';
import { GAS_CODE_SNIPPET } from './gasCodeTemplate.ts';

// 示範預覽資料（若使用者的試算表尚未建立任何資料時，提供即時參考體驗）
const DEMO_BOOKS: Book[] = [
  {
    id: 'DEMO-1',
    title: '微積分 (Calculus: Early Transcendentals 9th)',
    price: 450,
    notes: '大一工管系微積分必修（陳老師班）。內頁約 8 成新，有少許鉛筆劃記重點，附習題解析筆記。',
    meetupInfo: '每週二、四中午 12:00 可於工學院大廳面交，或隨時寄放至系學會辦公室自取',
    seller: '陳學長',
    sellerContact: 'LINE: chen_cal99 / 工管三',
    status: 'available',
    createdAt: '2026-09-12',
  },
  {
    id: 'DEMO-2',
    title: '經濟學原理 (Principles of Economics - Mankiw)',
    price: 380,
    notes: '商學院共同必修。書況良好無缺頁，附期中考重點整理手寫筆記影本。',
    meetupInfo: '週一至週五放學後管院大門口，可代交商學院系學會轉交',
    seller: '林學姊',
    sellerContact: 'LINE: mandy_econ / 國企四',
    status: 'available',
    createdAt: '2026-09-13',
  },
  {
    id: 'DEMO-3',
    title: '資料結構與演算法 (Data Structures & Algorithms in Java)',
    price: 520,
    notes: '資工系大二必修。極新，無劃線筆記，含原廠光碟/電子代碼。',
    meetupInfo: '電資大樓 3F 交誼廳面交，或代放系辦公室信箱',
    seller: '張學長',
    sellerContact: 'LINE: dsa_master / 資工三',
    status: 'available',
    createdAt: '2026-09-14',
  },
];

// ⭐️ 內建寫死的校園二手書 Google Apps Script (GAS) API 網址
export const BUILTIN_GAS_URL =
  'https://script.google.com/macros/s/AKfycbyf6yKHuDjp65iXY1etKYrixzbw94BVIgn2DzUNUDqieBgL4eEh_eg0Kn5PTQGTeWY/exec';

export default function App() {
  // =========================================================================
  // ⭐️ 內建的 Google Apps Script (GAS) API 網址
  // =========================================================================
  const [gasUrl, setGasUrl] = useState<string>(() => {
    const saved = localStorage.getItem('campus_book_gas_url');
    if (!saved || saved.includes('AKfycbzc1pFbDnCk5_qKoFwqaWAkOKJd7cjJ_awJfM2D-ALVaYeLleB0HGeJVpUSa3AR-jpx')) {
      localStorage.setItem('campus_book_gas_url', BUILTIN_GAS_URL);
      return BUILTIN_GAS_URL;
    }
    return saved || BUILTIN_GAS_URL;
  });

  // 書籍列表資料
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [gasErrorType, setGasErrorType] = useState<'GAS_RUNTIME_ERROR' | 'AUTH_REQUIRED' | 'NETWORK' | null>(null);
  const [gasErrorDetail, setGasErrorDetail] = useState<string | null>(null);
  const [isUsingDemoData, setIsUsingDemoData] = useState<boolean>(false);

  // 搜尋與篩選
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'available'>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'priceAsc' | 'priceDesc'>('latest');

  // 學長姊上架表單狀態
  const [formTitle, setFormTitle] = useState<string>('');
  const [formPrice, setFormPrice] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formMeetupInfo, setFormMeetupInfo] = useState<string>('');
  const [formSellerContact, setFormSellerContact] = useState<string>('');
  const [isSubmittingListing, setIsSubmittingListing] = useState<boolean>(false);

  // 登記購買彈出視窗狀態
  const [selectedBookForPurchase, setSelectedBookForPurchase] = useState<Book | null>(null);
  const [buyerName, setBuyerName] = useState<string>('');
  const [buyerContact, setBuyerContact] = useState<string>('');
  const [tradeTime, setTradeTime] = useState<string>('');
  const [buyerNote, setBuyerNote] = useState<string>('');
  const [isSubmittingPurchase, setIsSubmittingPurchase] = useState<boolean>(false);

  // 刪除書籍確認彈窗狀態
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);
  const [isDeletingBook, setIsDeletingBook] = useState<boolean>(false);

  // UI 輔助彈窗與通知狀態
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showGasModal, setShowGasModal] = useState<boolean>(false);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [tempGasUrl, setTempGasUrl] = useState<string>(gasUrl);

  // 表單元素 ID
  const searchInputId = useId();
  const filterSelectId = useId();
  const sortSelectId = useId();
  const formTitleId = useId();
  const formPriceId = useId();
  const formNotesId = useId();
  const formMeetupId = useId();
  const formSellerId = useId();
  const buyerNameId = useId();
  const buyerContactId = useId();
  const buyerTradeTimeId = useId();
  const buyerNoteId = useId();

  // 自動顯示 Toast
  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // =========================================================================
  // 安全發送 POST 請求至 Google Apps Script (優先使用後端代理以獲得明確回應)
  // =========================================================================
  const postDataToGas = async (targetUrl: string, payload: any): Promise<any> => {
    const cleanUrl = (targetUrl || '').trim();
    if (!cleanUrl) {
      throw new Error('未設定 Apps Script API 網址');
    }

    // 優先經由伺服端代理 POST
    try {
      const proxyResp = await fetch('/api/gas-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl: cleanUrl, payload }),
      });
      if (proxyResp.ok) {
        const json = await proxyResp.json();
        if (json.status === 'success') {
          return json.data || { status: 'success', bookId: payload.id || payload.bookId };
        }
      }
    } catch (proxyErr) {
      console.warn('伺服端 POST 代理未連通，嘗試瀏覽器端直接傳送:', proxyErr);
    }

    const payloadString = JSON.stringify(payload);

    try {
      // 瀏覽器端使用 mode: 'no-cors'，避免 302 重定向跨域問題
      await fetch(cleanUrl, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-cache',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: payloadString,
      });
      return { status: 'success', bookId: payload.id || payload.bookId };
    } catch (err: any) {
      console.warn('no-cors 模式異常，嘗試直接傳送:', err);
      const res = await fetch(cleanUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: payloadString,
      });
      try {
        return await res.json();
      } catch {
        return { status: 'success', bookId: payload.id || payload.bookId };
      }
    }
  };

  // =========================================================================
  // 1. GET: 從 GAS 抓取書籍資料 (結合伺服端代理與精準錯誤診斷)
  // =========================================================================
  const fetchBooksFromGas = async (targetUrl = gasUrl) => {
    setIsLoadingBooks(true);
    setFetchError(null);
    setGasErrorType(null);
    setGasErrorDetail(null);

    const cleanTargetUrl = (targetUrl || '').trim();
    if (!cleanTargetUrl) {
      setIsLoadingBooks(false);
      setFetchError('未設定 Apps Script API 網址');
      return;
    }

    try {
      let rawData: any = null;
      let usedProxy = false;

      // 步驟 1: 優先透過伺服端代理 (/api/gas-proxy) 解析，解除瀏覽器跨域限制並精確抓出 GAS 代碼異常
      try {
        const proxyResp = await fetch(`/api/gas-proxy?url=${encodeURIComponent(cleanTargetUrl)}`);
        if (proxyResp.ok) {
          const proxyJson = await proxyResp.json();
          if (proxyJson.status === 'success' && proxyJson.data !== undefined) {
            rawData = proxyJson.data;
            usedProxy = true;
          } else if (proxyJson.status === 'error') {
            setGasErrorType(proxyJson.errorType || 'GAS_RUNTIME_ERROR');
            setGasErrorDetail(proxyJson.message || proxyJson.rawError);
            throw new Error(proxyJson.message || 'Google Apps Script 後端執行失敗');
          }
        }
      } catch (proxyErr: any) {
        if (
          proxyErr.message &&
          (proxyErr.message.includes('TypeError') ||
           proxyErr.message.includes('Cannot read') ||
           proxyErr.message.includes('Apps Script') ||
           proxyErr.message.includes('所有人') ||
           proxyErr.message.includes('登入驗證'))
        ) {
          throw proxyErr;
        }
        console.warn('伺服端代理未回傳資料，嘗試瀏覽器端直接連線:', proxyErr);
      }

      // 步驟 2: 若未經由代理取得，嘗試瀏覽器直接 fetch (跟隨 302 重定向)
      if (!usedProxy) {
        const response = await fetch(cleanTargetUrl, {
          method: 'GET',
          redirect: 'follow',
        });

        if (!response.ok) {
          throw new Error(`HTTP 錯誤碼: ${response.status}`);
        }

        rawData = await response.json();
      }

      // 相容陣列格式或包在屬性中的格式
      let bookList: any[] = [];
      if (Array.isArray(rawData)) {
        bookList = rawData;
      } else if (rawData && Array.isArray(rawData.books)) {
        bookList = rawData.books;
      } else if (rawData && Array.isArray(rawData.data)) {
        bookList = rawData.data;
      } else if (rawData && rawData.status === 'error') {
        throw new Error(rawData.message || 'Google Apps Script 回傳錯誤狀態');
      }

      // 標準化書籍格式
      const normalized: Book[] = bookList.map((item, idx) => ({
        id: String(item.id || item.bookId || `b_${idx + 1}`),
        title: String(item.title || item.bookTitle || item.name || '未命名書本'),
        price: Number(item.price) || 0,
        notes: String(item.notes || item.note || item.content || item.teacher || ''),
        meetupInfo: String(item.meetupInfo || item.meetup || item.time || item.department || ''),
        sellerContact: String(item.sellerContact || item.seller || item.contact || ''),
        status: (item.status === 'reserved' || item.status === 'sold') ? item.status : 'available',
        createdAt: item.createdAt ? String(item.createdAt) : undefined,
      }));

      // 更新為遠端試算表真實書籍清單
      setBooks(normalized);
      setIsUsingDemoData(false);
      setFetchError(null);
      setGasErrorType(null);
      setGasErrorDetail(null);

      if (normalized.length === 0) {
        // 如果遠端試算表剛建立還是空清單，不報錯，僅正常展示空狀態
      }
    } catch (err: any) {
      console.warn('GAS GET 載入異常:', err);
      const errMsg = err.message || '連線失敗';
      setFetchError(errMsg);
      if (!gasErrorType) {
        if (errMsg.includes('TypeError') || errMsg.includes('Cannot read') || errMsg.includes('getDataRange')) {
          setGasErrorType('GAS_RUNTIME_ERROR');
          setGasErrorDetail(errMsg);
        } else if (errMsg.includes('Failed to fetch')) {
          setGasErrorType('NETWORK');
        }
      }
    } finally {
      setIsLoadingBooks(false);
    }
  };

  // 初始載入
  useEffect(() => {
    fetchBooksFromGas();
  }, [gasUrl]);

  // =========================================================================
  // 2. POST: 學長姊上架專區表單送出
  // =========================================================================
  const handleListingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formTitle.trim()) {
      showToast('請輸入完整書名', 'error');
      return;
    }
    const parsedPrice = parseFloat(formPrice);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      showToast('請輸入正確的書籍價格', 'error');
      return;
    }
    if (!formMeetupInfo.trim()) {
      showToast('請填寫可約面交時間或代交系學會方式', 'error');
      return;
    }

    setIsSubmittingListing(true);

    const newBookId = `B_${Date.now()}`;
    const formattedCreatedAt = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });

    // 準備傳送至 GAS 的 Payload
    const newBookPayload = {
      action: 'list', // 標記為上架動作
      id: newBookId,
      title: formTitle.trim(),
      price: parsedPrice,
      notes: formNotes.trim(),
      meetupInfo: formMeetupInfo.trim(),
      sellerContact: formSellerContact.trim() || '學長姊自售',
      createdAt: formattedCreatedAt,
    };

    try {
      const result = await postDataToGas(gasUrl, newBookPayload);

      // 直接將新書資料推入列表一次
      const newBook: Book = {
        id: (result && result.bookId) || newBookId,
        title: newBookPayload.title,
        price: newBookPayload.price,
        notes: newBookPayload.notes,
        meetupInfo: newBookPayload.meetupInfo,
        sellerContact: newBookPayload.sellerContact,
        status: 'available',
        createdAt: formattedCreatedAt,
      };

      setBooks((prev) => [newBook, ...prev.filter((b) => b.id !== newBook.id)]);
      setIsUsingDemoData(false);

      showToast('書籍已成功上架！感謝學長姊傳承知識', 'success');

      // 清空表單
      setFormTitle('');
      setFormPrice('');
      setFormNotes('');
      setFormMeetupInfo('');
      setFormSellerContact('');

      // 注意：直接將新書資料推入列表一次，不觸發全域重新載入，避免畫面上出現短暫重複卡片

      // 平滑捲動至選購區
      const browseSection = document.getElementById('browse-section');
      if (browseSection) {
        browseSection.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err: any) {
      console.error('上架失敗:', err);
      showToast('送出失敗，請檢查網路連線或稍後重試', 'error');
    } finally {
      setIsSubmittingListing(false);
    }
  };

  // =========================================================================
  // 3. POST: 學弟妹登記購買彈窗送出
  // =========================================================================
  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBookForPurchase) return;

    if (!buyerName.trim()) {
      showToast('請填寫登記姓名或稱謂', 'error');
      return;
    }
    if (!buyerContact.trim()) {
      showToast('請填寫聯絡方式（LINE / 手機）方便學長姊聯繫', 'error');
      return;
    }
    if (!tradeTime.trim()) {
      showToast('請填寫期望的交易時間或取書地點', 'error');
      return;
    }

    setIsSubmittingPurchase(true);

    const purchasePayload: PurchaseRequest & { action: string } = {
      action: 'order', // 標記為購買登記動作
      bookId: selectedBookForPurchase.id,
      bookTitle: selectedBookForPurchase.title,
      buyerName: buyerName.trim(),
      buyerContact: buyerContact.trim(),
      tradeTime: tradeTime.trim(),
      note: buyerNote.trim(),
    };

    try {
      await postDataToGas(gasUrl, purchasePayload);

      showToast(`已登記購買《${selectedBookForPurchase.title}》，系統已記錄至後端！`, 'success');

      // 本地即時更新該書本狀態為 reserved
      setBooks((prev) =>
        prev.map((b) =>
          b.id === selectedBookForPurchase.id ? { ...b, status: 'reserved' } : b
        )
      );

      // 關閉視窗並清空表單
      setSelectedBookForPurchase(null);
      setBuyerName('');
      setBuyerContact('');
      setTradeTime('');
      setBuyerNote('');

      // 背景同步
      setTimeout(() => {
        fetchBooksFromGas();
      }, 2500);
    } catch (err: any) {
      console.error('購買登記失敗:', err);
      showToast('登記失敗，請檢查網路或稍後重試', 'error');
    } finally {
      setIsSubmittingPurchase(false);
    }
  };

  // =========================================================================
  // 4. POST: 刪除書籍 (呼叫後端 Apps Script 刪除試算表對應列資料並重新整理)
  // =========================================================================
  const handleDeleteBook = async (book: Book) => {
    setIsDeletingBook(true);

    const deletePayload = {
      action: 'delete',
      id: book.id,
      bookId: book.id,
      title: book.title,
    };

    try {
      await postDataToGas(gasUrl, deletePayload);

      showToast(`已成功刪除《${book.title}》！`, 'success');

      // 本地立即移除，達成零延遲反饋
      setBooks((prev) => prev.filter((b) => b.id !== book.id));
      setBookToDelete(null);
    } catch (err: any) {
      console.error('刪除失敗:', err);
      showToast('刪除失敗，請檢查網路連線或稍後重試', 'error');
    } finally {
      setIsDeletingBook(false);
    }
  };

  // 載入預覽範例書籍（供試算表初期無資料時快速檢驗）
  const handleLoadDemo = () => {
    setBooks(DEMO_BOOKS);
    setIsUsingDemoData(true);
    setFetchError(null);
    showToast('已載入 3 本示範二手書，可自由測試登記與介面瀏覽！', 'info');
  };

  // 儲存 GAS 網址設定
  const handleSaveGasUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = tempGasUrl.trim();
    if (!cleanUrl) {
      showToast('API 網址不可為空', 'error');
      return;
    }
    setGasUrl(cleanUrl);
    localStorage.setItem('campus_book_gas_url', cleanUrl);
    setShowConfigModal(false);
    showToast('API 網址已更新並重新載入書籍', 'success');
    fetchBooksFromGas(cleanUrl);
  };

  // 複製後端 GAS 代碼
  const handleCopyCode = () => {
    navigator.clipboard.writeText(GAS_CODE_SNIPPET);
    setCopiedCode(true);
    showToast('GAS 後端代碼已複製到剪貼簿！', 'success');
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // 書籍清單過濾與排序
  const filteredBooks = books
    .filter((book) => {
      const matchStatus = filterStatus === 'all' || book.status === 'available';
      const kw = searchKeyword.toLowerCase().trim();
      const matchKeyword =
        !kw ||
        book.title.toLowerCase().includes(kw) ||
        book.notes.toLowerCase().includes(kw) ||
        book.meetupInfo.toLowerCase().includes(kw) ||
        (book.sellerContact && book.sellerContact.toLowerCase().includes(kw));
      return matchStatus && matchKeyword;
    })
    .sort((a, b) => {
      if (sortBy === 'priceAsc') return a.price - b.price;
      if (sortBy === 'priceDesc') return b.price - a.price;
      return 0; // 預設照原本 (最新)
    });

  return (
    <div className="min-h-screen bg-[#faf9f6] text-stone-800 flex flex-col font-sans selection:bg-stone-200">
      {/* 頂部極簡導覽與資訊列 */}
      <header
        id="app-header"
        className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-stone-200/80 px-4 sm:px-8 py-3.5 transition-all"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-stone-900 text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5 text-stone-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-stone-900 tracking-tight leading-none">
                  校園二手書交易平台
                </h1>
                <span className="hidden sm:inline-block text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                  Campus Exchange
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5 hidden sm:block">
                學長姊書籍出清傳承 • 學弟妹平價選購登記
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* GAS 試算表代碼教學按鈕 */}
            <button
              id="open-gas-guide-btn"
              type="button"
              onClick={() => setShowGasModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-stone-600 bg-stone-100/80 hover:bg-stone-200/70 border border-stone-200 transition-colors"
              title="查看後端 Google Apps Script 範本代碼"
            >
              <Code2 className="w-3.5 h-3.5 text-stone-500" />
              <span className="hidden md:inline">GAS 後端代碼</span>
            </button>

            {/* API 網址設定鈕 */}
            <button
              id="open-api-config-btn"
              type="button"
              onClick={() => {
                setTempGasUrl(gasUrl);
                setShowConfigModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-stone-700 bg-white hover:bg-stone-50 border border-stone-200 shadow-2xs transition-colors"
              title="設定或檢視 Google Apps Script API 網址"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden md:inline">API 狀態</span>
              <Settings className="w-3.5 h-3.5 text-stone-400" />
            </button>

            {/* 快速直達上架按鈕 */}
            <a
              id="nav-to-sell-btn"
              href="#sell-section"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-stone-900 text-white hover:bg-stone-800 shadow-xs transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5 text-stone-300" />
              <span>我要上架</span>
            </a>
          </div>
        </div>
      </header>

      {/* 主內容區域 */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 space-y-12">
        {/* 極簡歡迎橫幅 (說明與快速連結) */}
        <section
          id="hero-banner"
          className="rounded-2xl bg-gradient-to-b from-white to-stone-50/60 border border-stone-200/90 p-6 sm:p-8 shadow-2xs"
        >
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 text-xs font-medium mb-3 border border-stone-200/60">
              <Sparkles className="w-3.5 h-3.5 text-stone-500" />
              <span>零手續費 • 校內直接面交或系學會代交</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight leading-snug">
              讓每本好書在校園延續價值，輕鬆找到學長姊的課堂用書。
            </h2>
            <p className="mt-2.5 text-sm sm:text-base text-stone-600 leading-relaxed">
              學長姊可填寫下方專區快速發布二手書；學弟妹選好書籍後，點選『登記購買』即可直接預訂並相約取書。所有資料即時連線至 Google Apps Script 雲端試算表。
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <a
                href="#browse-section"
                className="px-4 py-2 text-xs font-medium rounded-lg bg-stone-900 text-white hover:bg-stone-800 transition-colors shadow-2xs"
              >
                瀏覽選購二手書 ({books.length})
              </a>
              <a
                href="#sell-section"
                className="px-4 py-2 text-xs font-medium rounded-lg bg-white text-stone-700 hover:bg-stone-50 border border-stone-200 transition-colors"
              >
                學長姊上架專區
              </a>
              {isUsingDemoData && (
                <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-md">
                  💡 目前顯示示範資料預覽
                </span>
              )}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 專區一：學弟妹選購專區 (Browse Cards List) */}
        {/* ========================================================================= */}
        <section id="browse-section" className="space-y-6 scroll-mt-20">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <h3 className="text-xl font-bold text-stone-900 tracking-tight">
                  學弟妹選購專區
                </h3>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                透過 GET 請求從 Google 試算表即時載入，點擊即可登記購買
              </p>
            </div>

            {/* 重新整理按鈕 */}
            <div className="flex items-center gap-2">
              <button
                id="refresh-books-btn"
                type="button"
                onClick={() => fetchBooksFromGas()}
                disabled={isLoadingBooks}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-stone-600 bg-white hover:bg-stone-50 border border-stone-200 shadow-2xs transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBooks ? 'animate-spin' : ''}`} />
                <span>{isLoadingBooks ? '正在同步...' : '重新整理'}</span>
              </button>
            </div>
          </div>

          {/* 搜尋、篩選與排序控制列 */}
          <div className="bg-white rounded-xl border border-stone-200 p-3 sm:p-4 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* 搜尋欄 */}
            <div className="relative flex-1">
              <label htmlFor={searchInputId} className="sr-only">搜尋二手書</label>
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id={searchInputId}
                type="text"
                placeholder="搜尋書名、老師姓名、筆記備註或系所..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-stone-50/80 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-stone-400 focus:bg-white transition-all placeholder:text-stone-400"
              />
              {searchKeyword && (
                <button
                  type="button"
                  onClick={() => setSearchKeyword('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 狀態過濾與排序 */}
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                <label htmlFor={filterSelectId} className="sr-only">篩選狀態</label>
                <select
                  id={filterSelectId}
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as 'all' | 'available')}
                  className="text-xs py-2 px-3 bg-stone-50/80 border border-stone-200 rounded-lg text-stone-700 focus:outline-hidden focus:ring-2 focus:ring-stone-400 focus:bg-white transition-all cursor-pointer"
                >
                  <option value="all">所有書籍</option>
                  <option value="available">僅看可購買</option>
                </select>
              </div>

              <div className="flex items-center">
                <label htmlFor={sortSelectId} className="sr-only">排序方式</label>
                <select
                  id={sortSelectId}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="text-xs py-2 px-3 bg-stone-50/80 border border-stone-200 rounded-lg text-stone-700 focus:outline-hidden focus:ring-2 focus:ring-stone-400 focus:bg-white transition-all cursor-pointer"
                >
                  <option value="latest">最新上架排序</option>
                  <option value="priceAsc">價格：由低至高</option>
                  <option value="priceDesc">價格：由高至低</option>
                </select>
              </div>
            </div>
          </div>

          {/* 連線錯誤提示與精準診斷修復指南 */}
          {fetchError && (
            <div className={`p-5 rounded-2xl border text-xs sm:text-sm flex flex-col sm:flex-row items-start gap-4 transition-all shadow-2xs ${
              gasErrorType === 'GAS_RUNTIME_ERROR' || fetchError.includes('TypeError') || fetchError.includes('getDataRange')
                ? 'bg-rose-50/90 border-rose-200/90 text-rose-950'
                : gasErrorType === 'AUTH_REQUIRED'
                ? 'bg-amber-50/90 border-amber-200/90 text-amber-950'
                : 'bg-stone-100 border-stone-200 text-stone-900'
            }`}>
              <div className="p-2 rounded-xl bg-white/80 border border-current/10 shrink-0 mt-0.5">
                <AlertCircle className={`w-5 h-5 ${
                  gasErrorType === 'GAS_RUNTIME_ERROR' || fetchError.includes('TypeError')
                    ? 'text-rose-600'
                    : 'text-amber-600'
                }`} />
              </div>
              <div className="space-y-2 flex-1">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm tracking-tight">
                      {gasErrorType === 'GAS_RUNTIME_ERROR' || fetchError.includes('TypeError') || fetchError.includes('getDataRange')
                        ? '後端 Google Apps Script 執行異常 (第 3 行)'
                        : gasErrorType === 'AUTH_REQUIRED'
                        ? 'Google Apps Script 權限未開放為所有人'
                        : '目前載入雲端試算表遇到狀況'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-medium ${
                      gasErrorType === 'GAS_RUNTIME_ERROR' || fetchError.includes('TypeError')
                        ? 'bg-rose-200/70 text-rose-800'
                        : 'bg-amber-200/70 text-amber-800'
                    }`}>
                      {gasErrorDetail ? '後端回報代碼錯誤' : '連線異常'}
                    </span>
                  </div>

                  <p className="mt-1 text-xs opacity-90 font-mono bg-white/60 p-2 rounded-lg border border-current/10 break-all">
                    {gasErrorDetail || fetchError}
                  </p>
                </div>

                <p className="text-xs leading-relaxed opacity-85">
                  {gasErrorType === 'GAS_RUNTIME_ERROR' || fetchError.includes('TypeError') || fetchError.includes('getDataRange') ? (
                    <>
                      <strong>原因診斷：</strong>後端程式碼在第 3 行執行 <code className="font-mono bg-white/80 px-1 py-0.5 rounded">getDataRange()</code> 時，因試算表尚未建立名為<strong>『書籍清單』</strong>的分頁而拋出異常。已為您準備好<strong>自動建表與防崩潰</strong>的修復代碼！
                    </>
                  ) : gasErrorType === 'AUTH_REQUIRED' ? (
                    <>
                      <strong>原因診斷：</strong>Apps Script 部署設定中未開放存取權限。請在 Apps Script 點選右上角「部署」&gt;「管理部署作業」，將<strong>「誰可以存取」設為「所有人 (Anyone)」</strong>。
                    </>
                  ) : (
                    <>
                      這通常是因為 Apps Script 尚未部署為「所有人皆可存取」或網路暫時延遲。
                    </>
                  )}
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowGasModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 text-white font-medium text-xs hover:bg-stone-800 transition-colors shadow-2xs"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    查看並一鍵複製修復版代碼
                  </button>

                  <button
                    type="button"
                    onClick={handleLoadDemo}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-stone-800 border border-stone-200 font-medium text-xs hover:bg-stone-50 transition-colors shadow-2xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    切換載入示範書籍預覽
                  </button>

                  <button
                    type="button"
                    onClick={() => fetchBooksFromGas()}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-stone-700 hover:text-stone-900 hover:bg-white/50 text-xs font-medium transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    貼上代碼後重試連線
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 載入中骨架畫面 (Loading Skeleton) */}
          {isLoadingBooks && books.length === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4 animate-pulse"
                >
                  <div className="h-5 bg-stone-200 rounded-md w-3/4" />
                  <div className="h-4 bg-stone-100 rounded-md w-1/3" />
                  <div className="h-16 bg-stone-100 rounded-md w-full" />
                  <div className="h-10 bg-stone-200 rounded-lg w-full" />
                </div>
              ))}
            </div>
          )}

          {/* 書籍卡片列表 */}
          {!isLoadingBooks && filteredBooks.length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-stone-300 p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 mx-auto flex items-center justify-center">
                <BookMarked className="w-6 h-6" />
              </div>
              <h4 className="font-semibold text-stone-800 text-base">目前尚無符合條件的書籍</h4>
              <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto">
                {searchKeyword
                  ? '試試看其他關鍵字，或是切換篩選條件。'
                  : '目前試算表內尚未登錄任何二手書籍。歡迎學長姊使用下方專區率先上架第一本書！'}
              </p>
              <div className="pt-2 flex items-center justify-center gap-3">
                <a
                  href="#sell-section"
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  立即前往上架
                </a>
                <button
                  type="button"
                  onClick={handleLoadDemo}
                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg bg-stone-100 text-stone-700 text-xs font-medium hover:bg-stone-200 transition-colors"
                >
                  載入範例書籍試用
                </button>
              </div>
            </div>
          )}

          {/* 卡片網格 (Cards Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredBooks.map((book) => {
              const isAvailable = book.status === 'available';
              return (
                <div
                  key={book.id}
                  id={`book-card-${book.id}`}
                  className="group bg-white rounded-2xl border border-stone-200/90 hover:border-stone-400/80 p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3.5">
                    {/* 頂部標籤與狀態 */}
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                          isAvailable
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200/90'
                            : 'bg-stone-100 text-stone-500 border-stone-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isAvailable ? 'bg-emerald-500' : 'bg-stone-400'
                          }`}
                        />
                        {isAvailable ? '可登記選購' : '已被登記預訂'}
                      </span>

                      {/* 價格標籤 */}
                      <div className="text-right">
                        <span className="text-xs text-stone-400 font-medium mr-1">NT$</span>
                        <span className="text-xl font-bold text-stone-900 tracking-tight">
                          {book.price.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* 書名 */}
                    <div>
                      <h4 className="font-bold text-stone-900 text-base leading-snug group-hover:text-stone-700 transition-colors line-clamp-2">
                        {book.title}
                      </h4>
                    </div>

                    {/* 備註（課程內容 / 老師 / 書況） */}
                    <div className="bg-stone-50 rounded-xl p-3 text-xs text-stone-600 border border-stone-100 space-y-1">
                      <div className="flex items-center gap-1.5 text-stone-500 font-medium">
                        <MessageSquare className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span>內容 / 授課老師 / 書況備註：</span>
                      </div>
                      <p className="pl-5 text-stone-700 leading-relaxed break-words line-clamp-3">
                        {book.notes || '賣家未填寫額外備註'}
                      </p>
                    </div>

                    {/* 可約時間 / 代交系學會 */}
                    <div className="text-xs text-stone-600 space-y-1">
                      <div className="flex items-center gap-1.5 font-medium text-stone-700">
                        <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span>交書方式與約定時間：</span>
                      </div>
                      <p className="pl-5 text-stone-600 leading-relaxed break-words">
                        {book.meetupInfo || '請點擊登記後進一步相約'}
                      </p>
                    </div>

                    {/* 賣家資訊 (若有) */}
                    {book.sellerContact && (
                      <div className="text-[11px] text-stone-500 flex items-center gap-1.5 pt-1 border-t border-stone-100">
                        <User className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span>學長姊聯絡：{book.sellerContact}</span>
                      </div>
                    )}
                  </div>

                  {/* 底部按鈕：登記購買與刪除書籍 */}
                  <div className="pt-4 mt-2 border-t border-stone-100 flex items-center gap-2">
                    <button
                      id={`buy-btn-${book.id}`}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => setSelectedBookForPurchase(book)}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                        isAvailable
                          ? 'bg-stone-900 text-white hover:bg-stone-800 shadow-2xs'
                          : 'bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200/60'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{isAvailable ? '登記購買此書' : '已預訂 (暫無法登記)'}</span>
                    </button>

                    <button
                      id={`delete-btn-${book.id}`}
                      type="button"
                      onClick={() => setBookToDelete(book)}
                      className="py-2.5 px-3 rounded-xl text-xs font-medium text-stone-500 hover:text-rose-600 hover:bg-rose-50 border border-stone-200 hover:border-rose-200 transition-colors flex items-center justify-center gap-1 shrink-0"
                      title="呼叫後端 Apps Script 自試算表中刪除此列書籍"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-stone-400 hover:text-rose-600 transition-colors" />
                      <span>刪除書籍</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 專區二：學長姊上架專區 (Seller Listing Form) */}
        {/* ========================================================================= */}
        <section id="sell-section" className="space-y-6 scroll-mt-20 pt-6">
          <div className="border-b border-stone-200 pb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-stone-900" />
              <h3 className="text-xl font-bold text-stone-900 tracking-tight">
                學長姊上架專區
              </h3>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              填寫下方表單，將課堂用書傳承給學弟妹，資料會透過 fetch API POST 至 Google Apps Script
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200/90 p-6 sm:p-8 shadow-2xs max-w-3xl">
            <form onSubmit={handleListingSubmit} className="space-y-5">
              {/* 書名欄位 */}
              <div className="space-y-1.5">
                <label htmlFor={formTitleId} className="block text-xs font-semibold text-stone-800">
                  書籍名稱 <span className="text-rose-500">*</span>
                </label>
                <input
                  id={formTitleId}
                  type="text"
                  required
                  placeholder="例：微積分 (Calculus 9th Edition)、經濟學原理、計算機概論"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-stone-50/70 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-stone-400 focus:bg-white transition-all placeholder:text-stone-400"
                />
              </div>

              {/* 價格與賣家稱謂 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 價格欄位 */}
                <div className="space-y-1.5">
                  <label htmlFor={formPriceId} className="block text-xs font-semibold text-stone-800">
                    售價 (新台幣 NT$) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-stone-400">
                      $
                    </span>
                    <input
                      id={formPriceId}
                      type="number"
                      min="0"
                      step="10"
                      required
                      placeholder="例：350"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      className="w-full pl-8 pr-3.5 py-2.5 text-xs sm:text-sm bg-stone-50/70 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-stone-400 focus:bg-white transition-all placeholder:text-stone-400"
                    />
                  </div>
                </div>

                {/* 賣家稱謂與聯絡 */}
                <div className="space-y-1.5">
                  <label htmlFor={formSellerId} className="block text-xs font-semibold text-stone-800">
                    學長姊稱謂與聯絡方式 <span className="text-stone-400 font-normal">(選填)</span>
                  </label>
                  <input
                    id={formSellerId}
                    type="text"
                    placeholder="例：企管三 王學長 (LINE: mylineid)"
                    value={formSellerContact}
                    onChange={(e) => setFormSellerContact(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-stone-50/70 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-stone-400 focus:bg-white transition-all placeholder:text-stone-400"
                  />
                </div>
              </div>

              {/* 備註（內容/老師/書況） */}
              <div className="space-y-1.5">
                <label htmlFor={formNotesId} className="block text-xs font-semibold text-stone-800">
                  備註（內容 / 授課老師 / 筆記書況） <span className="text-stone-400 font-normal">(建議填寫)</span>
                </label>
                <textarea
                  id={formNotesId}
                  rows={3}
                  placeholder="例：這本是企管系林老師班級指定用書，內頁約 8 成新，有少許鉛筆劃記與期中期末必考重點標籤，無缺頁或水痕。"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-stone-50/70 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-stone-400 focus:bg-white transition-all placeholder:text-stone-400"
                />
              </div>

              {/* 可約時間 / 代交系學會 */}
              <div className="space-y-1.5">
                <label htmlFor={formMeetupId} className="block text-xs font-semibold text-stone-800">
                  可約時間 / 代交系學會地點 <span className="text-rose-500">*</span>
                </label>
                <input
                  id={formMeetupId}
                  type="text"
                  required
                  placeholder="例：每週二或四中午 12:10 管院中庭面交，或可代放管院系學會辦公室自行領取"
                  value={formMeetupInfo}
                  onChange={(e) => setFormMeetupInfo(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-stone-50/70 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-stone-400 focus:bg-white transition-all placeholder:text-stone-400"
                />
              </div>

              {/* 送出與說明 */}
              <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-[11px] text-stone-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>透過 fetch API 以 POST 格式直接寫入 Apps Script</span>
                </div>

                <button
                  id="submit-listing-btn"
                  type="submit"
                  disabled={isSubmittingListing}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 active:scale-[0.99] transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmittingListing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>正在上架傳送中...</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>送出書籍上架</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>

      {/* ========================================================================= */}
      {/* 彈出視窗：學弟妹『登記購買』Modal */}
      {/* ========================================================================= */}
      {selectedBookForPurchase && (
        <div
          id="purchase-modal"
          className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 transition-all"
        >
          <div
            className="bg-white rounded-2xl border border-stone-200 max-w-lg w-full p-6 sm:p-7 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-3">
              <div>
                <span className="text-[11px] font-semibold tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                  登記選購確認
                </span>
                <h3 className="text-lg font-bold text-stone-900 mt-1">
                  登記購買《{selectedBookForPurchase.title}》
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBookForPurchase(null)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 書籍資訊摘要卡片 */}
            <div className="bg-stone-50 rounded-xl p-3.5 border border-stone-200/80 text-xs space-y-1.5 text-stone-600">
              <div className="flex justify-between items-center text-stone-900 font-semibold">
                <span>書籍售價：</span>
                <span className="text-base text-stone-900 font-bold">
                  NT$ {selectedBookForPurchase.price.toLocaleString()}
                </span>
              </div>
              <div className="text-[11px] text-stone-500">
                <span className="font-medium text-stone-700">學長姊交書備註：</span>
                {selectedBookForPurchase.meetupInfo || '無特別指定'}
              </div>
              {selectedBookForPurchase.sellerContact && (
                <div className="text-[11px] text-stone-500">
                  <span className="font-medium text-stone-700">賣家資訊：</span>
                  {selectedBookForPurchase.sellerContact}
                </div>
              )}
            </div>

            {/* 買家填寫表單 */}
            <form onSubmit={handlePurchaseSubmit} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor={buyerNameId} className="block text-xs font-semibold text-stone-800">
                  您的姓名 / 稱謂與系級 <span className="text-rose-500">*</span>
                </label>
                <input
                  id={buyerNameId}
                  type="text"
                  required
                  placeholder="例：大一企管 李同學"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-stone-400 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor={buyerContactId} className="block text-xs font-semibold text-stone-800">
                  聯絡方式（LINE ID、手機或 Email） <span className="text-rose-500">*</span>
                </label>
                <input
                  id={buyerContactId}
                  type="text"
                  required
                  placeholder="例：LINE ID: student_lee / 手機: 0912-345-678"
                  value={buyerContact}
                  onChange={(e) => setBuyerContact(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-stone-400 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor={buyerTradeTimeId} className="block text-xs font-semibold text-stone-800">
                  期望交易時間與偏好方式 <span className="text-rose-500">*</span>
                </label>
                <input
                  id={buyerTradeTimeId}
                  type="text"
                  required
                  placeholder="例：週四中午 12:30 在系辦公室自取，或是管院中庭"
                  value={tradeTime}
                  onChange={(e) => setTradeTime(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-stone-400 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor={buyerNoteId} className="block text-xs font-semibold text-stone-800">
                  給學長姊的留言備註 <span className="text-stone-400 font-normal">(選填)</span>
                </label>
                <input
                  id={buyerNoteId}
                  type="text"
                  placeholder="例：想詢問老師平時上課風格，非常感謝學長姊！"
                  value={buyerNote}
                  onChange={(e) => setBuyerNote(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-stone-400 focus:bg-white transition-all"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedBookForPurchase(null)}
                  className="px-4 py-2 text-xs font-medium rounded-xl text-stone-600 hover:bg-stone-100 transition-colors"
                >
                  取消
                </button>
                <button
                  id="confirm-purchase-btn"
                  type="submit"
                  disabled={isSubmittingPurchase}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-stone-900 text-white hover:bg-stone-800 shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingPurchase ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>記錄中...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>確認登記購買 (POST)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 彈出視窗：刪除書籍確認 Modal */}
      {/* ========================================================================= */}
      {bookToDelete && (
        <div
          id="delete-book-modal"
          className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 transition-all"
        >
          <div
            className="bg-white rounded-2xl border border-stone-200 max-w-md w-full p-6 space-y-4 shadow-xl animate-in fade-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1 flex-1">
                <h3 className="text-base font-bold text-stone-900">
                  確認刪除這本二手書？
                </h3>
                <p className="text-xs text-stone-500">
                  系統將發送請求至 Google Apps Script 後端，並自雲端試算表中刪除對應的資料列。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBookToDelete(null)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 書籍摘要卡 */}
            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-stone-900 text-sm line-clamp-1">
                  {bookToDelete.title}
                </span>
                <span className="font-bold text-stone-800">
                  NT$ {bookToDelete.price}
                </span>
              </div>
              <p className="text-stone-500 text-[11px] font-mono">
                書籍編號 (ID): {bookToDelete.id}
              </p>
              {bookToDelete.notes && (
                <p className="text-stone-600 line-clamp-2">
                  {bookToDelete.notes}
                </p>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setBookToDelete(null)}
                disabled={isDeletingBook}
                className="px-4 py-2 text-xs font-medium rounded-xl text-stone-600 hover:bg-stone-100 transition-colors"
              >
                取消
              </button>
              <button
                id="confirm-delete-btn"
                type="button"
                disabled={isDeletingBook}
                onClick={() => handleDeleteBook(bookToDelete)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-700 shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeletingBook ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>正在從試算表刪除...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>確認刪除書籍</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 彈出視窗：Google Apps Script API 網址設定 Modal */}
      {/* ========================================================================= */}
      {showConfigModal && (
        <div
          id="config-modal"
          className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 transition-all"
        >
          <div
            className="bg-white rounded-2xl border border-stone-200 max-w-lg w-full p-6 space-y-5 shadow-xl animate-in fade-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Google Apps Script (GAS) API 網址
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  程式碼已預設為您提供的網址，也可在此直接切換或更新
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGasUrl} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-700">
                  Web App Exec 網址 (doGet / doPost)：
                </label>
                <textarea
                  rows={3}
                  value={tempGasUrl}
                  onChange={(e) => setTempGasUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full px-3 py-2 text-xs font-mono bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-stone-400 focus:bg-white"
                />
              </div>

              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs text-stone-600 space-y-1">
                <p className="font-medium text-stone-800">📌 提示：</p>
                <p>• 預設常數在 <code className="bg-stone-200 px-1 py-0.5 rounded text-[11px]">src/types.ts</code> 中的 <code className="bg-stone-200 px-1 py-0.5 rounded text-[11px]">DEFAULT_GAS_URL</code></p>
                <p>• 部署時請選擇：<strong>執行身分：我</strong>，<strong>誰可以存取：所有人 (Anyone)</strong></p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setTempGasUrl(DEFAULT_GAS_URL)}
                  className="text-xs text-stone-500 hover:text-stone-800 underline"
                >
                  恢復原始預設網址
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(false)}
                    className="px-3.5 py-1.5 text-xs text-stone-600 hover:bg-stone-100 rounded-lg"
                  >
                    關閉
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-lg shadow-2xs"
                  >
                    儲存並測試連線
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 彈出視窗：GAS 後端代碼 (Code.gs) 範本與教學 */}
      {/* ========================================================================= */}
      {showGasModal && (
        <div
          id="gas-guide-modal"
          className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 transition-all"
        >
          <div
            className="bg-white rounded-2xl border border-stone-200 max-w-2xl w-full p-6 space-y-4 shadow-xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-stone-700" />
                  Google Apps Script (Code.gs) 後端代碼範本
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  若您的 Apps Script 尚未撰寫寫入試算表的邏輯，可直接將以下代碼複製貼入試算表的 Apps Script 中！
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGasModal(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-1.5 text-stone-700 leading-relaxed">
                <p className="font-semibold text-stone-900">🚀 快速部署 3 步驟：</p>
                <ol className="list-decimal list-inside space-y-0.5 text-stone-600">
                  <li>開啟您的 Google 試算表，點選上方工具列的 <strong>擴充功能 &gt; Apps Script</strong></li>
                  <li>清空原內容，將下方代碼複製並貼上到 <strong>Code.gs</strong></li>
                  <li>點擊右上角 <strong>部署 &gt; 新增部署作業</strong>，選擇「網頁應用程式」，存取權限選擇「<strong>所有人 (Anyone)</strong>」並複製網址！</li>
                </ol>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="absolute right-3 top-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-white/90 hover:bg-white text-stone-800 border border-stone-300 shadow-2xs transition-colors"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">已複製！</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>複製全部代碼</span>
                    </>
                  )}
                </button>
                <pre className="bg-stone-900 text-stone-100 p-4 rounded-xl text-[11px] font-mono leading-relaxed overflow-x-auto max-h-72 selection:bg-stone-700">
                  {GAS_CODE_SNIPPET}
                </pre>
              </div>
            </div>

            <div className="pt-2 border-t border-stone-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowGasModal(false)}
                className="px-4 py-2 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-xl"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 浮動通知 (Toast) */}
      {toastMessage && (
        <div
          id="toast-notification"
          className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-stone-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center justify-between gap-3 text-xs sm:text-sm animate-in slide-in-from-bottom-5 duration-200"
        >
          <div className="flex items-center gap-2.5">
            {toastMessage.type === 'success' && (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            {toastMessage.type === 'error' && (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            {toastMessage.type === 'info' && (
              <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
            )}
            <span className="leading-snug">{toastMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-stone-400 hover:text-white shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 極簡頁腳 */}
      <footer className="mt-auto border-t border-stone-200 bg-white/70 py-6 px-4 text-center text-xs text-stone-400">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>校園二手書交易平台 • 極簡淺色風格單頁應用</p>
          <p className="flex items-center gap-2">
            <span>後端資料串接：Google Apps Script (GAS) Webhook</span>
            <span>•</span>
            <button
              type="button"
              onClick={() => setShowGasModal(true)}
              className="text-stone-600 hover:underline"
            >
              檢視試算表代碼
            </button>
          </p>
        </div>
      </footer>
    </div>
  );
}
