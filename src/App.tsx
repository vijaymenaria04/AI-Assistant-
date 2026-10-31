import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { SidebarDrawer } from './components/SidebarDrawer';
import { BottomNav } from './components/BottomNav';
import { VoiceOrbModal } from './components/VoiceOrbModal';
import { OwnerConfirmModal } from './components/OwnerConfirmModal';
import { SplashScreen } from './components/SplashScreen';

import { WorkspaceDashboard } from './views/WorkspaceDashboard';
import { SalesView } from './views/SalesView';
import { ExpensesView } from './views/ExpensesView';
import { PurchasesView } from './views/PurchasesView';
import { InventoryView } from './views/InventoryView';
import { SuppliersView } from './views/SuppliersView';
import { PaymentsView } from './views/PaymentsView';
import { StaffView } from './views/StaffView';
import { CateringView } from './views/CateringView';
import { PersonalFinanceView } from './views/PersonalFinanceView';
import { TasksRemindersView } from './views/TasksRemindersView';
import { ReportsView } from './views/ReportsView';
import { AIAssistantView } from './views/AIAssistantView';
import { NotificationsView } from './views/NotificationsView';
import { SettingsView } from './views/SettingsView';
import { PosterStudioView } from './views/PosterStudioView';

import { BusinessId, BUSINESSES } from './types/database';
import { db } from './services/db';
import { voice } from './services/voice';
import { ParsedAgentResult } from './services/aiAgent';
import { useTranslation } from './services/i18n';

export default function App() {
  // Refresh all visible screens and dialogs when the language changes.
  useTranslation();
  const [showSplash, setShowSplash] = useState(true);
  const [currentBusinessId, setCurrentBusinessId] = useState<BusinessId>(() => {
    const saved = localStorage.getItem('gopalai-workspace');
    return saved && Object.prototype.hasOwnProperty.call(BUSINESSES, saved) ? saved as BusinessId : 'jain-sweets';
  });
  const [activeScreen, setActiveScreen] = useState<string>('home');
  const [canGoBack, setCanGoBack] = useState(false);
  const routeRef = useRef({ screen: 'home', businessId: currentBusinessId });
  const historyRef = useRef<Array<{ screen: string; businessId: BusinessId }>>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isVoiceOrbOpen, setIsVoiceOrbOpen] = useState(false);
  const [pendingOwnerConfirmation, setPendingOwnerConfirmation] = useState<ParsedAgentResult | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const themeRef = useRef<'dark' | 'light'>('dark');
  const databaseReady = useRef<Promise<void>>(Promise.resolve());
  const themeWrites = useRef<Promise<void>>(Promise.resolve());

  const applyTheme = (next: 'dark' | 'light') => {
    themeRef.current = next;
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    document.body.classList.toggle('dark', next === 'dark');
  };

  useEffect(() => {
    // Every app launch starts in dark mode, even if the previous session used light.
    applyTheme('dark');
    databaseReady.current = db.init();
    databaseReady.current.then(() => db.getSettings()).then(settings => voice.setPreferences(settings.voiceSpeed, settings.voiceGender)).catch(() => {});
    // Queue the initial setting before later theme changes so a quick toggle wins.
    themeWrites.current = databaseReady.current
      .then(() => db.saveSettings({ theme: 'dark' }))
      .catch((error) => console.error('Unable to initialize app settings:', error));

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    const handleUnhandledFailure = () => setActionMessage('An operation failed. Check your records before retrying.');
    window.addEventListener('unhandledrejection', handleUnhandledFailure);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledFailure);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleToggleTheme = () => {
    const next = themeRef.current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    // Serialize saves so a quick double-click cannot persist an older choice last.
    themeWrites.current = themeWrites.current
      .catch(() => {})
      .then(() => databaseReady.current)
      .then(() => db.saveSettings({ theme: next }))
      .catch((error) => console.error('Unable to save theme:', error));
  };

  const applyRoute = (route: { screen: string; businessId: BusinessId }) => {
    routeRef.current = route;
    setCurrentBusinessId(route.businessId);
    localStorage.setItem('gopalai-workspace', route.businessId);
    setActiveScreen(route.screen);
  };

  const navigateTo = (screen: string, businessId: BusinessId) => {
    const current = routeRef.current;
    if (current.screen === screen && current.businessId === businessId) return;
    historyRef.current = [...historyRef.current.slice(-99), current];
    setCanGoBack(true);
    applyRoute({ screen, businessId });
  };

  const handleBack = () => {
    const previous = historyRef.current.pop();
    if (!previous) return;
    applyRoute(previous);
    setCanGoBack(historyRef.current.length > 0);
  };

  const handleSelectBusiness = (id: BusinessId) => navigateTo('home', id);

  const handleNavigate = (screen: string) => {
    if (screen === 'personal' || screen === 'catering') {
      navigateTo(screen, screen === 'personal' ? 'personal' : 'gopal-caterers');
    } else if (screen === 'jain-sweets' || screen === 'paan-bai' || screen === 'kesarwadi' || screen === 'gopal-caterers') {
      handleSelectBusiness(screen);
    } else {
      navigateTo(screen, routeRef.current.businessId);
    }
  };

  const resetNavigation = () => {
    historyRef.current = [];
    setCanGoBack(false);
    applyRoute({ screen: 'home', businessId: routeRef.current.businessId });
  };

  const requestConfirmation = (result: ParsedAgentResult) => { setActionMessage(null); setPendingOwnerConfirmation(result); };

  const renderActiveScreen = () => {
    switch (activeScreen) {
      case 'home':
        return <WorkspaceDashboard currentBusinessId={currentBusinessId} onSelectBusiness={handleSelectBusiness} onNavigate={handleNavigate} onOpenVoiceOrb={() => setIsVoiceOrbOpen(true)} />;
      case 'combined':
        return <ReportsView key="combined" currentBusinessId={currentBusinessId} initialWorkspace="combined" />;
      case 'sales':
        return <SalesView currentBusinessId={currentBusinessId} onRequestConfirmation={requestConfirmation} />;
      case 'expenses':
        return <ExpensesView currentBusinessId={currentBusinessId} />;
      case 'purchases':
        return <PurchasesView currentBusinessId={currentBusinessId} />;
      case 'inventory':
        return <InventoryView currentBusinessId={currentBusinessId} />;
      case 'suppliers':
        return <SuppliersView currentBusinessId={currentBusinessId} onRequestConfirmation={requestConfirmation} />;
      case 'payments':
        return <PaymentsView currentBusinessId={currentBusinessId} onRequestConfirmation={requestConfirmation} />;
      case 'staff':
        return <StaffView currentBusinessId={currentBusinessId} />;
      case 'catering':
      case 'gopal-caterers':
        return <CateringView currentBusinessId={currentBusinessId} />;
      case 'personal':
        return <PersonalFinanceView onRequestConfirmation={requestConfirmation} />;
      case 'tasks':
        return <TasksRemindersView currentBusinessId={currentBusinessId} onRequestConfirmation={requestConfirmation} />;
      case 'reports':
        return <ReportsView key={currentBusinessId} currentBusinessId={currentBusinessId} />;
      case 'ai-assistant':
        return (
          <AIAssistantView
            currentBusinessId={currentBusinessId}
            onOpenVoiceOrb={() => setIsVoiceOrbOpen(true)}
            onRequestConfirmation={(result) => { setActionMessage(null); setPendingOwnerConfirmation(result); }}
          />
        );
      case 'poster-studio':
        return <PosterStudioView currentBusinessId={currentBusinessId} />;
      case 'notifications':
        return <NotificationsView currentBusinessId={currentBusinessId} />;
      case 'settings':
        return (
          <SettingsView
            theme={theme}
            onToggleTheme={handleToggleTheme}
            onDataReset={resetNavigation}
          />
        );
      default:
        return <WorkspaceDashboard currentBusinessId={currentBusinessId} onSelectBusiness={handleSelectBusiness} onNavigate={handleNavigate} onOpenVoiceOrb={() => setIsVoiceOrbOpen(true)} />;
    }
  };

  const finishSplash = useCallback(() => setShowSplash(false), []);

  if (showSplash) {
    return <SplashScreen onFinish={finishSplash} theme={theme} />;
  }

  return (
    <div data-theme={theme} className={`app-shell ${activeScreen === 'home' ? 'is-home' : ''} min-h-screen ${theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'} font-sans transition-colors duration-200 selection:bg-amber-500/30 selection:text-amber-400`}>
      {/* Top Glassmorphic Header */}
      <Header
        currentBusinessId={currentBusinessId}
        onSelectBusiness={handleSelectBusiness}
        onOpenDrawer={() => setIsDrawerOpen(true)}
        onOpenVoiceOrb={() => setIsVoiceOrbOpen(true)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        isOnline={isOnline}
        onBack={handleBack}
        canGoBack={canGoBack}
        showBackButton={activeScreen !== 'home'}
      />

      {/* Main Screen Container */}
      <main className="transition-all duration-200">
        {renderActiveScreen()}
      </main>

      {/* Navigation Drawer */}
      <SidebarDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeScreen={activeScreen}
        onNavigate={handleNavigate}
        currentBusinessId={currentBusinessId}
        onSelectBusiness={handleSelectBusiness}
      />

      {/* Android Mobile Bottom Tab Navigation */}
      <BottomNav
        activeScreen={activeScreen}
        onNavigate={handleNavigate}
        onOpenVoiceOrb={() => setIsVoiceOrbOpen(true)}
      />

      {/* Voice Orb Modal */}
      <VoiceOrbModal
        isOpen={isVoiceOrbOpen}
        onClose={() => setIsVoiceOrbOpen(false)}
        currentBusinessId={currentBusinessId}
        onRequestConfirmation={(result) => setPendingOwnerConfirmation(result)}
        onActionExecuted={() => {}}
      />

      {actionMessage && <div role="status" className="fixed top-20 right-4 z-40 max-w-sm rounded-xl border border-amber-500/30 bg-white dark:bg-slate-900 p-3 text-sm text-slate-900 dark:text-slate-100 shadow-lg"><span>{actionMessage}</span><button aria-label="Dismiss" className="ml-3" onClick={() => setActionMessage(null)}>×</button></div>}

      {/* Owner Confirmation Dialog */}
      <OwnerConfirmModal
        pendingAction={pendingOwnerConfirmation}
        onConfirm={(message) => { setPendingOwnerConfirmation(null); setActionMessage(message); }}
        onCancel={() => setPendingOwnerConfirmation(null)}
      />

    </div>
  );
}
