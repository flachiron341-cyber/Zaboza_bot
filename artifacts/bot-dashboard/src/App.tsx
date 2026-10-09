import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { ClerkProvider, Show, SignIn, SignUp, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { arSA } from '@clerk/localizations';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Activity, ArrowLeft, Bot, Check, ChevronLeft, CircleAlert, CircleCheck, Clock3, Fingerprint, Gauge, KeyRound, LoaderCircle, LockKeyhole, LogOut, Play, RefreshCw, Settings2, ShieldCheck, Square, Terminal, X } from 'lucide-react';
import { Link, Redirect, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import { getGetBotDashboardQueryKey, useControlBot, useGetBotDashboard, useSaveBotSession, useUpdateBotSettings } from '@workspace/api-client-react';
import type { BotDashboard, BotEvent } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import './dashboard.css';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function stripBase(path: string) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

const appearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#315f57',
    colorForeground: '#203638',
    colorMutedForeground: '#71807d',
    colorDanger: '#a94337',
    colorBackground: '#fffdf8',
    colorInput: '#faf7f0',
    colorInputForeground: '#203638',
    colorNeutral: '#d9d5ca',
    fontFamily: '"IBM Plex Sans Arabic", sans-serif',
    borderRadius: '16px',
  },
  elements: {
    rootBox: 'w-[440px] max-w-full flex justify-center',
    cardBox: 'bg-[#fffdf8] rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#203638] font-bold',
    headerSubtitle: 'text-[#71807d]',
    socialButtonsBlockButtonText: 'text-[#203638]',
    formFieldLabel: 'text-[#203638]',
    footerActionLink: 'text-[#315f57] font-semibold',
    footerActionText: 'text-[#71807d]',
    dividerText: 'text-[#71807d]',
    identityPreviewEditButton: 'text-[#315f57]',
    formFieldSuccessText: 'text-[#315f57]',
    alertText: 'text-[#a94337]',
    logoBox: 'rounded-xl',
    logoImage: 'max-h-9',
    socialButtonsBlockButton: 'border-[#dedbd1] bg-[#faf7f0] rounded-xl',
    formButtonPrimary: 'bg-[#315f57] hover:bg-[#244b44] rounded-xl',
    formFieldInput: 'bg-[#faf7f0] border-[#dedbd1] rounded-xl text-[#203638]',
    footerAction: 'text-[#71807d]',
    dividerLine: 'bg-[#dedbd1]',
    alert: 'bg-[#fff0ed] border-[#f0c7bf]',
    otpCodeFieldInput: 'border-[#dedbd1] rounded-lg',
    formFieldRow: 'gap-2',
    main: 'gap-4',
  },
};

function BrandMark({ compact = false }: { compact?: boolean }) {
  return <div className={`brand-mark ${compact ? 'brand-mark-small' : ''}`} aria-label="مِرساة">
    <span className="brand-symbol"><Bot size={compact ? 18 : 21} strokeWidth={1.8} /></span>
    {!compact && <span className="brand-name">مِرساة<span className="brand-caption">غرفة تحكّم خاصة</span></span>}
  </div>;
}

function HomeRedirect() {
  return <Show when="signed-in"><Redirect to="/dashboard" /></Show>;
}

function Home() {
  return <Show when="signed-out">
    <main className="landing" dir="rtl">
      <header className="landing-nav">
        <Link href="/" className="brand-link"><BrandMark /></Link>
        <div className="nav-trust"><span className="tiny-shield"><ShieldCheck size={14} /></span> مساحة خاصة للمطوّر فقط</div>
        <Link href="/sign-in" className="nav-login focus-ring" data-testid="link-sign-in">تسجيل الدخول <ArrowLeft size={15} /></Link>
      </header>
      <section className="hero">
        <div className="hero-copy reveal">
          <div className="eyebrow"><span className="eyebrow-dot" /> تحكّم واضح. اتصال موثوق.</div>
          <h1>بوتك،<br /><em>تحت السيطرة.</em></h1>
          <p className="hero-lede">غرفة تحكّم خاصة لبوت Messenger. راقب الاتصال، أدر الجلسة، وأعد التشغيل — من مكان واحد، دون كشف بيانات ملفات الارتباط.</p>
          <div className="hero-actions">
            <Link href="/sign-in" className="button-primary focus-ring" data-testid="link-open-dashboard">الدخول إلى لوحة التحكّم <ArrowLeft size={17} /></Link>
            <span className="hero-private"><LockKeyhole size={14} /> وصول للمصرّح لهم فقط</span>
          </div>
          <div className="hero-footnote"><span className="font-mono">01 / 03</span><span className="footnote-line" /> واجهة تشغيل هادئة، لا ضجيج فيها</div>
        </div>
        <div className="hero-visual reveal-delay" aria-label="معاينة لوحة مراقبة البوت">
          <div className="visual-index font-mono">CONTROL / 01</div>
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="signal-core"><div className="signal-inner"><Bot size={39} strokeWidth={1.35} /></div><span className="signal-wave wave-a" /><span className="signal-wave wave-b" /></div>
          <div className="visual-card visual-status"><span className="visual-kicker">حالة الاتصال</span><strong><i /> متصل ويعمل</strong><span className="font-mono visual-time">LIVE · 00:00:14</span></div>
          <div className="visual-card visual-session"><div className="session-icon"><Fingerprint size={17} /></div><div><span className="visual-kicker">جلسة Messenger</span><strong>بيانات الجلسة محمية</strong></div><Check size={16} className="session-check" /></div>
          <div className="visual-coordinates font-mono">24°42' N<br />46°40' E</div>
          <div className="visual-rule" />
        </div>
      </section>
      <section className="landing-strip">
        <div><span className="strip-number font-mono">A</span><strong>حالة مباشرة</strong><p>اعرف فوراً ما إذا كان البوت متصلاً أو يحتاج انتباهك.</p></div>
        <div><span className="strip-number font-mono">B</span><strong>جلسة خاصة</strong><p>تُحفظ ملفات الارتباط دون عرضها مجدداً بعد الإرسال.</p></div>
        <div><span className="strip-number font-mono">C</span><strong>إعادة اتصال تلقائية</strong><p>اختر إن كان على البوت استعادة الاتصال عند انقطاعه.</p></div>
      </section>
      <footer className="landing-footer"><BrandMark compact /><span>واجهة تشغيل شخصية لبوت Messenger</span><span className="font-mono">PRIVATE INSTANCE · 2025</span></footer>
    </main>
  </Show>;
}

function AuthPage({ mode }: { mode: 'in' | 'up' }) {
  return <main className="auth-page" dir="rtl">
    <div className="auth-context">
      <Link href="/" className="brand-link"><BrandMark /></Link>
      <div className="auth-context-content"><div className="eyebrow"><span className="eyebrow-dot" /> وصول آمن</div><h1>{mode === 'in' ? 'مرحباً بعودتك.' : 'مساحتك، بضوابطك.'}</h1><p>لوحة تحكّم خاصة. سجّل الدخول باستخدام حسابك المصرّح به.</p><div className="auth-security"><LockKeyhole size={16} /><span>تُحفظ الجلسة في المتصفح، ولا تُشارك بياناتك مع أي طرف آخر.</span></div></div>
      <span className="auth-side-code font-mono">MRS / AUTH / 01</span>
    </div>
    <div className="auth-form-wrap">
      <div className="auth-mobile-brand"><Link href="/" className="brand-link"><BrandMark /></Link></div>
      <div className="auth-card-heading"><span className="auth-overline font-mono">{mode === 'in' ? 'SIGN IN' : 'CREATE ACCOUNT'}</span><h2>{mode === 'in' ? 'تسجيل الدخول' : 'إنشاء حساب'}</h2><p>يُسمح فقط للحسابات المدرجة في قائمة المسؤولين.</p></div>
      {mode === 'in' ? <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /> : <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />}
      <p className="auth-foot"><ShieldCheck size={14} /> حماية الحساب عبر Clerk</p>
    </div>
  </main>;
}

function SignOutControl() {
  const { signOut } = useClerk();
  return <button className="quiet-action" onClick={() => signOut({ redirectUrl: basePath || '/' })} data-testid="button-sign-out"><LogOut size={16} /><span>خروج</span></button>;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const client = useQueryClient();
  useEffect(() => {
    let previous: string | null | undefined;
    const unsubscribe = addListener(({ user }) => {
      const next = user?.id ?? null;
      if (previous !== undefined && previous !== next) client.clear();
      previous = next;
    });
    return unsubscribe;
  }, [addListener, client]);
  return null;
}

function Shell({ children, active }: { children: ReactNode; active: 'dashboard' | 'settings' }) {
  const { user } = useUser();
  const [location] = useLocation();
  const name = user?.firstName || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'المسؤول';
  const nav = <nav className="side-nav">
    <div className="nav-section-label">المساحة</div>
    <Link href="/dashboard" className={`side-link ${active === 'dashboard' ? 'is-active' : ''}`} data-testid="link-dashboard"><Gauge size={17} /><span>نظرة عامة</span>{active === 'dashboard' && <span className="active-indicator" />}</Link>
    <Link href="/settings" className={`side-link ${active === 'settings' ? 'is-active' : ''}`} data-testid="link-settings"><Settings2 size={17} /><span>الإعدادات</span>{active === 'settings' && <span className="active-indicator" />}</Link>
    <div className="nav-divider" />
    <div className="nav-section-label">الخدمة</div>
    <div className="nav-status"><span className="nav-status-dot" /><span>خدمة التحكم</span><span className="font-mono nav-status-label">API</span></div>
    <div className="sidebar-bottom"><div className="sidebar-privacy"><ShieldCheck size={17} /><div><strong>جلسة خاصة</strong><span>بياناتك لا تظهر هنا</span></div></div><div className="sidebar-user"><div className="user-avatar">{name.slice(0, 1).toUpperCase()}</div><div className="user-details"><strong>{name}</strong><span>مسؤول البوت</span></div><SignOutControl /></div></div>
  </nav>;
  return <div className="app-shell" dir="rtl">
    <aside className="sidebar"><Link href="/dashboard" className="brand-link sidebar-brand"><BrandMark /></Link>{nav}<div className="sidebar-build font-mono"><span>BUILD 01.04</span><span>RTL / MENA</span></div></aside>
    <div className="mobile-top"><Link href="/dashboard" className="brand-link"><BrandMark /></Link><SignOutControl /></div>
    <div className="mobile-nav">{nav}</div>
    <main className="main-area"><header className="topbar"><div className="breadcrumbs"><span>مِرساة</span><ChevronLeft size={14} /><span>{active === 'dashboard' ? 'نظرة عامة' : 'الإعدادات'}</span></div><div className="topbar-right"><span className="server-indicator"><i /> النظام متاح</span><span className="topbar-divider" /><span className="font-mono topbar-clock">PRIVATE / {location === '/settings' ? '02' : '01'}</span></div></header>{children}<footer className="page-footer"><span>مِرساة · لوحة تشغيل خاصة</span><span className="footer-security"><LockKeyhole size={12} /> لا تُعرض بيانات الجلسة بعد الحفظ</span></footer></main>
  </div>;
}

function ForbiddenState() {
  return <div className="access-denied" dir="rtl"><div className="denied-mark"><LockKeyhole size={25} /></div><span className="auth-overline font-mono">403 / ACCESS RESTRICTED</span><h2>هذا الحساب غير مصرّح له</h2><p>تتحقق الخدمة من قائمة المسؤولين قبل إتاحة لوحة البوت. سجّل الدخول بالحساب المصرّح به أو تواصل مع مالك النظام.</p><SignOutControl /><Link href="/" className="denied-home" data-testid="link-return-home">العودة إلى الصفحة الرئيسية <ArrowLeft size={14} /></Link></div>;
}

function isForbidden(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const value = error as { status?: number; statusCode?: number; response?: { status?: number } };
  return value.status === 403 || value.statusCode === 403 || value.response?.status === 403;
}

function ErrorPanel({ onRetry, message = 'تعذّر تحميل بيانات البوت الآن.' }: { onRetry: () => void; message?: string }) {
  return <div className="error-panel"><div className="error-icon"><CircleAlert size={20} /></div><div><strong>لم نتمكن من إكمال الطلب</strong><p>{message}</p></div><button onClick={onRetry} className="retry-button" data-testid="button-retry"><RefreshCw size={15} /> أعد المحاولة</button></div>;
}

function Dashboard() {
  const query = useGetBotDashboard({ query: { queryKey: getGetBotDashboardQueryKey(), retry: (count, error) => !isForbidden(error) && count < 1 } });
  const control = useControlBot();
  const saveSession = useSaveBotSession();
  const client = useQueryClient();
  const [cookieText, setCookieText] = useState('');
  const [parseError, setParseError] = useState('');
  const [controlError, setControlError] = useState('');
  const [saveNotice, setSaveNotice] = useState('');
  const data = query.data as BotDashboard | undefined;

  const runControl = (action: 'start' | 'stop') => {
    setControlError('');
    control.mutate({ data: { action } }, { onSuccess: () => client.invalidateQueries({ queryKey: getGetBotDashboardQueryKey() }), onError: (error) => setControlError(isForbidden(error) ? 'لا يملك هذا الحساب صلاحية التحكم.' : 'تعذّر تنفيذ الأمر. تحقّق من الاتصال وحاول مجدداً.') });
  };
  const submitSession = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setParseError(''); setSaveNotice('');
    let appState: unknown;
    try { appState = JSON.parse(cookieText); } catch { setParseError('صيغة JSON غير صالحة. صحّحها قبل الحفظ.'); return; }
    if (!Array.isArray(appState) || appState.length < 1 || appState.some((entry) => !entry || typeof entry !== 'object' || Array.isArray(entry))) {
      setParseError('أدخل مصفوفة JSON تحتوي على عنصر ملف ارتباط واحد على الأقل.'); return;
    }
    saveSession.mutate({ data: { appState } }, {
      onSuccess: (receipt) => {
        setCookieText('');
        if (receipt.accepted) {
          setSaveNotice('تم حفظ الجلسة بأمان.');
          client.invalidateQueries({ queryKey: getGetBotDashboardQueryKey() });
        } else {
          setParseError('لم تقبل الخدمة الجلسة. أعد إدخال بياناتك بعد التحقق منها.');
        }
      },
      onError: (error) => setParseError(isForbidden(error) ? 'هذا الحساب غير مصرّح له بحفظ الجلسة.' : 'لم يتم حفظ الجلسة. لم نحتفظ بالنص؛ أعد إدخاله بعد التحقق من الاتصال.'),
    });
    setCookieText('');
  };

  if (query.isLoading) return <Shell active="dashboard"><DashboardSkeleton /></Shell>;
  if (isForbidden(query.error)) return <Shell active="dashboard"><ForbiddenState /></Shell>;
  if (query.isError || !data) return <Shell active="dashboard"><ErrorPanel onRetry={() => query.refetch()} /></Shell>;
  const status = statusInfo(data.status);
  return <Shell active="dashboard"><div className="dashboard-content">
    <section className="page-heading reveal"><div><div className="eyebrow page-eyebrow"><span className="eyebrow-dot" /> مساحة البوت</div><h1>نظرة عامة</h1><p>حالة الخدمة والجلسة، في مكان واحد.</p></div><div className="updated-label"><span className="font-mono">آخر تحديث</span><strong>{formatDate(data.updatedAt)}</strong></div></section>
    <section className="status-banner reveal-delay">
      <div className="status-banner-main"><div className={`status-icon status-${data.status}`}><Bot size={24} strokeWidth={1.7} /></div><div><span className="section-overline font-mono">MESSENGER BOT / STATUS</span><h2>{status.title}</h2><p>{status.description}</p></div></div>
      <div className="status-banner-actions"><span className={`status-pill status-pill-${data.status}`}><i />{status.label}</span>{data.status === 'running' || data.status === 'connecting' ? <button className="button-danger" onClick={() => runControl('stop')} disabled={control.isPending} data-testid="button-stop-bot">{control.isPending ? <LoaderCircle className="spin" size={16} /> : <Square size={14} fill="currentColor" />} إيقاف البوت</button> : <button className="button-primary compact" onClick={() => runControl('start')} disabled={control.isPending || !data.sessionConfigured} title={!data.sessionConfigured ? 'احفظ جلسة Messenger أولاً' : undefined} data-testid="button-start-bot">{control.isPending ? <LoaderCircle className="spin" size={16} /> : <Play size={15} fill="currentColor" />} تشغيل البوت</button>}</div>
    </section>
    {controlError && <div className="inline-error" role="alert"><CircleAlert size={15} />{controlError}<button onClick={() => setControlError('')} aria-label="إغلاق"><X size={14} /></button></div>}
    <section className="metrics-row">
      <article className="metric-card"><div className="metric-top"><span>جلسة Messenger</span><span className={`mini-state ${data.sessionConfigured ? 'good' : 'warn'}`}><i />{data.sessionConfigured ? 'مهيّأة' : 'غير مهيّأة'}</span></div><div className="metric-main"><div className="metric-icon sea"><KeyRound size={19} /></div><strong>{data.sessionConfigured ? 'جاهزة' : 'تحتاج إعداداً'}</strong></div><p>{data.sessionConfigured ? 'بيانات الجلسة محفوظة بأمان.' : 'أضف بيانات الجلسة لبدء تشغيل البوت.'}</p></article>
      <article className="metric-card"><div className="metric-top"><span>تأخير الرسائل</span><span className="metric-tag font-mono">FIXED</span></div><div className="metric-main"><div className="metric-icon gold"><Clock3 size={19} /></div><strong className="metric-latin font-latin">{data.messageDelaySeconds}<small> ثوانٍ</small></strong></div><p>تأخير ثابت قبل إرسال كل رسالة.</p></article>
      <article className="metric-card"><div className="metric-top"><span>مؤشر الكتابة</span><span className={`mini-state ${data.typingIndicator ? 'good' : 'off'}`}><i />{data.typingIndicator ? 'مفعّل' : 'متوقف'}</span></div><div className="metric-main"><div className="metric-icon ink"><Activity size={19} /></div><strong>{data.typingIndicator ? 'يظهر للمستخدم' : 'غير ظاهر'}</strong></div><p>سلوك المؤشر مُدار من إعدادات الخدمة.</p></article>
    </section>
    <section className="dashboard-grid">
      <article className="panel session-panel"><div className="panel-heading"><div><span className="section-overline font-mono">SECURE CREDENTIALS</span><h2>حفظ جلسة Messenger</h2></div><div className="panel-heading-mark"><LockKeyhole size={17} /></div></div><p className="panel-description">الصق ملف الارتباط بصيغة JSON. نستخدمه لتأمين الاتصال فقط، ولن نعرض محتواه بعد الحفظ.</p>
        <form onSubmit={submitSession} className="cookie-form"><label htmlFor="cookie-json">ملف الجلسة <span className="font-mono">JSON</span></label><div className="code-field"><div className="code-field-top"><div className="code-dots"><i /><i /><i /></div><span className="font-mono">appState.json</span><span className="sensitive-tag"><LockKeyhole size={11} /> خاص</span></div><textarea id="cookie-json" dir="ltr" spellCheck={false} autoComplete="off" value={cookieText} onChange={(event) => { setCookieText(event.target.value); setParseError(''); }} placeholder={'[\n  { "key": "c_user", "value": "…" }\n]'} data-testid="input-cookie-json" aria-label="ملف الجلسة بصيغة JSON" /></div>
          <div className="sensitive-note"><ShieldCheck size={14} /><span>لن يُعاد عرض النص بعد الحفظ. امسح الحافظة بعد اللصق.</span></div>
          {parseError && <div className="form-error" role="alert"><CircleAlert size={14} />{parseError}</div>}
          {saveNotice && <div className="form-success" role="status"><CircleCheck size={14} />{saveNotice}</div>}
          <button type="submit" className="button-primary save-button" disabled={saveSession.isPending || !cookieText.trim()} data-testid="button-save-session">{saveSession.isPending ? <LoaderCircle className="spin" size={16} /> : <LockKeyhole size={15} />} حفظ الجلسة وبدء التشغيل <ArrowLeft size={15} /></button>
        </form>
      </article>
      <article className="panel events-panel"><div className="panel-heading"><div><span className="section-overline font-mono">RECENT ACTIVITY</span><h2>الأحداث الأخيرة</h2></div><div className="event-count font-mono">{String(data.recentEvents?.length || 0).padStart(2, '0')}</div></div>
        {!data.recentEvents?.length ? <div className="empty-events"><div className="empty-event-icon"><Terminal size={20} /></div><strong>لا توجد أحداث بعد</strong><p>ستظهر هنا تغييرات حالة البوت ونشاط الاتصال.</p><span className="font-mono">EVENT LOG / READY</span></div> : <div className="event-list">{data.recentEvents.map((item) => <EventRow key={item.id} event={item} />)}</div>}
        <div className="events-foot"><span className="live-pulse" /> سجلّ الخدمة <span className="font-mono">LIVE FEED</span></div>
      </article>
    </section>
    <div className="dashboard-lower-note"><div className="lower-note-icon"><ShieldCheck size={16} /></div><span><strong>بياناتك تبقى خاصة.</strong> صلاحية الحساب تُتحقق على مستوى الخدمة قبل كل إجراء.</span><span className="font-mono lower-note-code">ADMIN / ONLY</span></div>
  </div></Shell>;
}

function EventRow({ event }: { event: BotEvent }) {
  const type = event.level === 'error' ? 'error' : event.level === 'warn' ? 'warn' : 'info';
  const Icon = type === 'error' ? CircleAlert : type === 'warn' ? CircleAlert : CircleCheck;
  return <div className="event-row" data-testid={`event-${event.id}`}><div className={`event-level event-${type}`}><Icon size={14} /></div><div className="event-copy"><strong>{event.message}</strong><span>{type === 'error' ? 'خطأ' : type === 'warn' ? 'تنبيه' : 'معلومة'}</span></div><time className="font-mono">{formatTime(event.timestamp)}</time></div>;
}

function Settings() {
  const query = useGetBotDashboard({ query: { queryKey: getGetBotDashboardQueryKey(), retry: (count, error) => !isForbidden(error) && count < 1 } });
  const update = useUpdateBotSettings();
  const client = useQueryClient();
  const [feedback, setFeedback] = useState('');
  const [errorText, setErrorText] = useState('');
  const data = query.data as BotDashboard | undefined;
  const changeReconnect = (value: boolean) => {
    setFeedback(''); setErrorText('');
    update.mutate({ data: { autoReconnect: value } }, {
      onSuccess: (next) => { client.setQueryData(getGetBotDashboardQueryKey(), next); setFeedback(value ? 'تم تفعيل إعادة الاتصال التلقائية.' : 'تم إيقاف إعادة الاتصال التلقائية.'); },
      onError: (error) => setErrorText(isForbidden(error) ? 'هذا الحساب غير مصرّح له بتعديل الإعدادات.' : 'تعذّر حفظ التغيير. حاول مجدداً.'),
    });
  };
  if (query.isLoading) return <Shell active="settings"><DashboardSkeleton /></Shell>;
  if (isForbidden(query.error)) return <Shell active="settings"><ForbiddenState /></Shell>;
  if (query.isError || !data) return <Shell active="settings"><ErrorPanel onRetry={() => query.refetch()} /></Shell>;
  return <Shell active="settings"><div className="settings-content">
    <section className="page-heading reveal"><div><div className="eyebrow page-eyebrow"><span className="eyebrow-dot" /> ضبط السلوك</div><h1>الإعدادات</h1><p>تفضيلات الاتصال وسلوك الرسائل.</p></div><div className="settings-heading-icon"><Settings2 size={21} /></div></section>
    <article className="panel settings-panel reveal-delay"><div className="settings-panel-title"><div className="settings-icon"><RefreshCw size={19} /></div><div><span className="section-overline font-mono">CONNECTION POLICY</span><h2>استعادة الاتصال</h2></div></div><p className="settings-lede">حدّد ما إذا كان على البوت محاولة الاتصال مجدداً عند انقطاع جلسة Messenger. هذا الخيار لا يغيّر بيانات الجلسة المحفوظة.</p>
      <div className="preference-row"><div className="preference-copy"><strong>إعادة الاتصال تلقائياً</strong><span>{data.autoReconnect ? 'سيحاول البوت استعادة الجلسة عند انقطاع الاتصال.' : 'لن يعاود البوت الاتصال دون تدخل منك.'}</span></div><button role="switch" aria-checked={data.autoReconnect} aria-label="إعادة الاتصال تلقائياً" className={`toggle-switch ${data.autoReconnect ? 'checked' : ''}`} onClick={() => changeReconnect(!data.autoReconnect)} disabled={update.isPending} data-testid="switch-auto-reconnect"><span /></button></div>
      {update.isPending && <div className="settings-feedback pending"><LoaderCircle size={14} className="spin" /> جارٍ حفظ التفضيل…</div>}
      {feedback && <div className="settings-feedback success"><CircleCheck size={14} />{feedback}</div>}
      {errorText && <div className="settings-feedback error"><CircleAlert size={14} />{errorText}<button onClick={() => changeReconnect(!data.autoReconnect)} data-testid="button-retry-setting">أعد المحاولة</button></div>}
    </article>
    <section className="fixed-behavior"><div className="fixed-behavior-header"><div><span className="section-overline font-mono">SERVICE BEHAVIOR</span><h2>سلوك ثابت للخدمة</h2></div><span className="fixed-label"><LockKeyhole size={12} /> مُدار من الخدمة</span></div>
      <div className="fixed-row"><div className="fixed-symbol"><Clock3 size={18} /></div><div><strong>تأخير الرسائل</strong><span>فاصل ثابت بين الرسائل الصادرة</span></div><div className="fixed-value font-mono">03 <small>SEC</small></div><span className="fixed-lock"><LockKeyhole size={14} /></span></div>
      <div className="fixed-row"><div className="fixed-symbol"><Activity size={18} /></div><div><strong>مؤشر الكتابة</strong><span>يظهر أثناء فترة تأخير الإرسال</span></div><div className={`fixed-state ${data.typingIndicator ? 'enabled' : 'disabled'}`}><i />{data.typingIndicator ? 'مفعّل' : 'غير مفعّل'}</div><span className="fixed-lock"><LockKeyhole size={14} /></span></div>
      <p className="fixed-footnote"><CircleAlert size={14} /> هذان السلوكان محددان من إعدادات الخدمة ولا يمكن تعديلهما من هذه اللوحة.</p>
    </section>
    <div className="settings-security"><div><ShieldCheck size={18} /><strong>خصوصية الوصول</strong></div><p>تخضع تغييرات الإعدادات لقائمة المسؤولين. لا تُرسل أي بيانات جلسة عند تعديل هذا الخيار.</p><span className="font-mono">AUTHORIZATION · SERVER ENFORCED</span></div>
  </div></Shell>;
}

function DashboardSkeleton() {
  return <div className="dashboard-content"><div className="skeleton-heading"><i /><i /></div><div className="skeleton-banner"><i /><i /><i /></div><div className="skeleton-metrics"><i /><i /><i /></div><div className="skeleton-bottom"><i /><i /></div></div>;
}

function statusInfo(status: string) {
  const statuses: Record<string, { title: string; label: string; description: string }> = {
    running: { title: 'كل شيء يسير كما ينبغي', label: 'يعمل', description: 'البوت متصل وجاهز لمعالجة الرسائل.' },
    connecting: { title: 'جارٍ الاتصال', label: 'يتصل', description: 'يحاول البوت إنشاء اتصال بجلسة Messenger.' },
    stopped: { title: 'البوت متوقف حالياً', label: 'متوقف', description: 'ابدأ تشغيل البوت عندما تكون مستعداً.' },
    error: { title: 'الاتصال يحتاج انتباهك', label: 'خطأ', description: 'تحقّق من الجلسة أو أعد الاتصال.' },
    unknown: { title: 'الحالة غير معروفة', label: 'غير معروف', description: 'لم تصل معلومات الحالة من الخدمة بعد.' },
  };
  return statuses[status] || statuses.unknown;
}
function formatDate(value: string | null) {
  if (!value) return 'لم يُحدّث بعد';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'لم يُحدّث بعد' : new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('ar', { hour: '2-digit', minute: '2-digit' }).format(date);
}

function ProtectedDashboard({ page }: { page: 'dashboard' | 'settings' }) {
  return <><Show when="signed-in">{page === 'dashboard' ? <Dashboard /> : <Settings />}</Show><Show when="signed-out"><Redirect to="/" /></Show></>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Router() {
  const [, setLocation] = useLocation();
  return <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={appearance} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`}
    localization={{ ...arSA, signIn: { ...(arSA.signIn ?? {}), start: { ...(arSA.signIn?.start ?? {}), title: 'مرحباً بعودتك', subtitle: 'سجّل الدخول إلى مساحة التحكّم الخاصة بك' } }, signUp: { ...(arSA.signUp ?? {}), start: { ...(arSA.signUp?.start ?? {}), title: 'إنشاء حساب', subtitle: 'حساب خاص بإدارة البوت' } } }}
    routerPush={(to) => setLocation(stripBase(to))} routerReplace={(to) => setLocation(stripBase(to), { replace: true })}>
    <ClerkQueryClientCacheInvalidator />
    <RoutedErrorBoundary><Switch>
      <Route path="/"><HomeRedirect /><Home /></Route>
      <Route path="/sign-in/*?" component={() => <AuthPage mode="in" />} />
      <Route path="/sign-up/*?" component={() => <AuthPage mode="up" />} />
      <Route path="/dashboard"><ProtectedDashboard page="dashboard" /></Route>
      <Route path="/settings"><ProtectedDashboard page="settings" /></Route>
      <Route component={NotFound} />
    </Switch></RoutedErrorBoundary>
  </ClerkProvider>;
}

function App() {
  if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={basePath}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;
