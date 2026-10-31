import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SidebarDrawer } from './components/SidebarDrawer';
import { BottomNav } from './components/BottomNav';
import { VoiceOrbModal } from './components/VoiceOrbModal';
import { OwnerConfirmModal } from './components/OwnerConfirmModal';
import { PINLockModal } from './components/PINLockModal';
import { AndroidAPKModal } from './components/AndroidAPKModal';
import { SplashScreen } from './components/SplashScreen';

import { HomeDashboardView } from './views/HomeDashboardView';
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

import { BusinessId } from './types/database';
import { db } from './services/db';
import { ParsedAgentResult } from './services/aiAgent';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentBusinessId, setCurrentBusinessId] = useState<BusinessId>('jain-sweets');
  const [activeScreen, setActiveScreen] = useState<string>('home');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isVoiceOrbOpen, setIsVoiceOrbOpen] = useState(false);
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [isAPKModalOpen, setIsAPKModalOpen] = useState(false);
  const [pendingOwnerConfirmation, setPendingOwnerConfirmation] = useState<ParsedAgentResult | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Database initialization
    db.init().then(async () => {
      const settings = await db.getSettings();
      const initialTheme = settings?.theme || 'dark';
      setTheme(initialTheme);
      if (initialTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
      }
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleToggleTheme = async () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    await db.saveSettings({ theme: next });
  };

  const handleSelectBusiness = (id: BusinessId) => {
    setCurrentBusinessId(id);
  };

  const renderActiveScreen = () => {
    switch (activeScreen) {
      case 'home':
      case 'combined':
        return (
          <HomeDashboardView
            currentBusinessId={currentBusinessId}
            onNavigate={setActiveScreen}
            onOpenVoiceOrb={() => setIsVoiceOrbOpen(true)}
          />
        );
      case 'sales':
        return <SalesView currentBusinessId={currentBusinessId} />;
      case 'expenses':
        return <ExpensesView currentBusinessId={currentBusinessId} />;
      case 'purchases':
        return <PurchasesView currentBusinessId={currentBusinessId} />;
      case 'inventory':
        return <InventoryView currentBusinessId={currentBusinessId} />;
      case 'suppliers':
        return <SuppliersView currentBusinessId={currentBusinessId} />;
      case 'payments':
        return <PaymentsView currentBusinessId={currentBusinessId} />;
      case 'staff':
        return <StaffView currentBusinessId={currentBusinessId} />;
      case 'catering':
      case 'gopal-caterers':
        return <CateringView currentBusinessId={currentBusinessId} />;
      case 'personal':
        return <PersonalFinanceView />;
      case 'tasks':
        return <TasksRemindersView />;
      case 'reports':
        return <ReportsView currentBusinessId={currentBusinessId} />;
      case 'ai-assistant':
        return (
          <AIAssistantView
            currentBusinessId={currentBusinessId}
            onOpenVoiceOrb={() => setIsVoiceOrbOpen(true)}
          />
        );
      case 'notifications':
        return <NotificationsView />;
      case 'settings':
        return (
          <SettingsView
            theme={theme}
            onToggleTheme={handleToggleTheme}
            onDataReset={() => setActiveScreen('home')}
          />
        );
      case 'jain-sweets':
      case 'paan-bai':
      case 'kesarwadi':
        return (
          <HomeDashboardView
            currentBusinessId={activeScreen as BusinessId}
            onNavigate={setActiveScreen}
            onOpenVoiceOrb={() => setIsVoiceOrbOpen(true)}
          />
        );
      default:
        return (
          <HomeDashboardView
            currentBusinessId={currentBusinessId}
            onNavigate={setActiveScreen}
            onOpenVoiceOrb={() => setIsVoiceOrbOpen(true)}
          />
        );
    }
  };

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'} font-sans transition-colors duration-200 selection:bg-amber-500/30 selection:text-amber-400`}>
      {/* Top Glassmorphic Header */}
      <Header
        currentBusinessId={currentBusinessId}
        onSelectBusiness={handleSelectBusiness}
        onOpenDrawer={() => setIsDrawerOpen(true)}
        onOpenVoiceOrb={() => setIsVoiceOrbOpen(true)}
        onOpenLockModal={() => setIsLockModalOpen(true)}
        onOpenAPKModal={() => setIsAPKModalOpen(true)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        isOnline={isOnline}
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
        onNavigate={setActiveScreen}
        currentBusinessId={currentBusinessId}
        onSelectBusiness={handleSelectBusiness}
      />

      {/* Android Mobile Bottom Tab Navigation */}
      <BottomNav
        activeScreen={activeScreen}
        onNavigate={setActiveScreen}
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

      {/* Owner Confirmation Dialog */}
      <OwnerConfirmModal
        pendingAction={pendingOwnerConfirmation}
        onConfirm={() => setPendingOwnerConfirmation(null)}
        onCancel={() => setPendingOwnerConfirmation(null)}
      />

      {/* Owner PIN Security Lock Screen */}
      <PINLockModal
        isOpen={isLockModalOpen}
        onUnlockSuccess={() => setIsLockModalOpen(false)}
      />

      {/* Android PWA & Backup Info Modal */}
      <AndroidAPKModal
        isOpen={isAPKModalOpen}
        onClose={() => setIsAPKModalOpen(false)}
        onDataImported={() => setActiveScreen('home')}
      />
    </div>
  );
}
