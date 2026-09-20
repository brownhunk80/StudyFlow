import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { OnboardingState, GuideKey, TourStep } from '../types';
import { GUIDE_STEPS } from '../data/guideSteps';
import { FirstTimeWelcomeModal } from '../components/guide/FirstTimeWelcomeModal';
import { SpotlightTourOverlay } from '../components/guide/SpotlightTourOverlay';

const STORAGE_KEY = 'studyflow_onboarding';

const DEFAULT_ONBOARDING: OnboardingState = {
  mainCompleted: false,
  homeGuideCompleted: false,
  learnGuideCompleted: false,
  chapterGuideCompleted: false,
  recallGuideCompleted: false,
  planGuideCompleted: false,
  progressGuideCompleted: false,
};

interface OnboardingContextValue {
  onboarding: OnboardingState;
  activeTour: { key: GuideKey; steps: TourStep[] } | null;
  isFirstTimeModalOpen: boolean;
  completeGuide: (key: GuideKey) => void;
  skipActiveTour: () => void;
  replayGuide: (key: GuideKey) => void;
  resetAllGuides: () => void;
  triggerPageTour: (key: GuideKey, force?: boolean) => void;
  closeFirstTimeModal: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [onboarding, setOnboarding] = useState<OnboardingState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_ONBOARDING, ...parsed };
      }
    } catch (e) {
      console.error('Failed to parse onboarding state', e);
    }
    return DEFAULT_ONBOARDING;
  });

  const [isFirstTimeModalOpen, setIsFirstTimeModalOpen] = useState<boolean>(false);
  const [activeTour, setActiveTour] = useState<{ key: GuideKey; steps: TourStep[] } | null>(null);

  // Sync state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(onboarding));
    } catch (e) {
      console.error('Failed to save onboarding state', e);
    }
  }, [onboarding]);

  // Check on first mount if main welcome modal should open
  useEffect(() => {
    if (!onboarding.mainCompleted) {
      // Small timeout to allow page layout to settle
      const t = setTimeout(() => {
        setIsFirstTimeModalOpen(true);
      }, 500);
      return () => clearTimeout(t);
    }
  }, [onboarding.mainCompleted]);

  const completeGuide = useCallback((key: GuideKey) => {
    setOnboarding((prev) => {
      const updated = { ...prev };
      if (key === 'main') updated.mainCompleted = true;
      if (key === 'home') updated.homeGuideCompleted = true;
      if (key === 'learn') updated.learnGuideCompleted = true;
      if (key === 'chapter') updated.chapterGuideCompleted = true;
      if (key === 'recall') updated.recallGuideCompleted = true;
      if (key === 'plan') updated.planGuideCompleted = true;
      if (key === 'progress') updated.progressGuideCompleted = true;
      return updated;
    });

    if (key === 'main') {
      setIsFirstTimeModalOpen(false);
    } else {
      setActiveTour(null);
    }
  }, []);

  const skipActiveTour = useCallback(() => {
    if (activeTour) {
      completeGuide(activeTour.key);
    }
  }, [activeTour, completeGuide]);

  const replayGuide = useCallback((key: GuideKey) => {
    if (key === 'main') {
      setActiveTour(null);
      setIsFirstTimeModalOpen(true);
      return;
    }

    const steps = GUIDE_STEPS[key] || [];
    if (steps.length > 0) {
      setIsFirstTimeModalOpen(false);
      setActiveTour({ key, steps });
    }
  }, []);

  const triggerPageTour = useCallback(
    (key: GuideKey, force: boolean = false) => {
      // If first-time welcome modal is open or a tour is already active, don't interrupt
      if (isFirstTimeModalOpen || activeTour) return;

      const isCompleted =
        (key === 'home' && onboarding.homeGuideCompleted) ||
        (key === 'learn' && onboarding.learnGuideCompleted) ||
        (key === 'chapter' && onboarding.chapterGuideCompleted) ||
        (key === 'recall' && onboarding.recallGuideCompleted) ||
        (key === 'plan' && onboarding.planGuideCompleted) ||
        (key === 'progress' && onboarding.progressGuideCompleted);

      if (!isCompleted || force) {
        const steps = GUIDE_STEPS[key] || [];
        if (steps.length > 0) {
          // Delay briefly to allow DOM elements to mount
          setTimeout(() => {
            setActiveTour({ key, steps });
          }, 400);
        }
      }
    },
    [onboarding, isFirstTimeModalOpen, activeTour]
  );

  const resetAllGuides = useCallback(() => {
    setOnboarding(DEFAULT_ONBOARDING);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const closeFirstTimeModal = useCallback(() => {
    setIsFirstTimeModalOpen(false);
    completeGuide('main');
  }, [completeGuide]);

  return (
    <OnboardingContext.Provider
      value={{
        onboarding,
        activeTour,
        isFirstTimeModalOpen,
        completeGuide,
        skipActiveTour,
        replayGuide,
        resetAllGuides,
        triggerPageTour,
        closeFirstTimeModal,
      }}
    >
      {children}

      {/* 1. First Time Welcome Modal */}
      <FirstTimeWelcomeModal
        isOpen={isFirstTimeModalOpen}
        onClose={closeFirstTimeModal}
        onComplete={closeFirstTimeModal}
      />

      {/* 2. Page-Specific Spotlight Tour */}
      {activeTour && (
        <SpotlightTourOverlay
          isOpen={true}
          steps={activeTour.steps}
          tourName={activeTour.key}
          onComplete={() => completeGuide(activeTour.key)}
          onSkip={skipActiveTour}
        />
      )}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = (): OnboardingContextValue => {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return ctx;
};
