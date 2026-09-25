/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { AuthScreen } from './components/AuthScreen';
import { HomeScreen } from './components/HomeScreen';
import { FocusScreen } from './components/FocusScreen';
import { PlanScreen } from './components/PlanScreen';
import { ProgressScreen } from './components/ProgressScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { RecallScreen } from './components/RecallScreen';
import { ActiveRecallSessionModal } from './components/ActiveRecallSessionModal';
import { AddCardModal } from './components/AddCardModal';
import { AddDeckModal } from './components/AddDeckModal';
import { ExamPrepModal } from './components/ExamPrepModal';
import { WhyThisTaskModal } from './components/WhyThisTaskModal';
import { TaskModal } from './components/TaskModal';
import { SubjectModal } from './components/SubjectModal';
import { AddExamModal } from './components/AddExamModal';
import { StudentMasteryGuideModal } from './components/StudentMasteryGuideModal';
import { SubjectFolderWorkspace } from './components/SubjectFolderWorkspace';
import { ToastNotification } from './components/ToastNotification';
import { DevTestSuitePage } from './components/studyflow/DevTestSuitePage';
import {
  TabType,
  PlanSubTab,
  UserProfile,
  SubjectItem,
  Exam,
  Chapter,
  TaskItem,
  FocusSession,
  FocusCompletionResult,
  Achievement,
  ChapterStatus,
  Flashcard,
  FlashcardDeck,
  RecallRating,
  ChapterCreationData,
  Section,
} from './types';
import {
  initialUserProfile,
  initialSubjects,
  initialExams,
  initialTasks,
  initialAchievements,
  initialFlashcards,
  initialFlashcardDecks,
} from './data/initialData';
import { calculateNextReview, isCardDue } from './utils/spacedRepetition';
import { fetchExtractChapterTopics } from './utils/aiClient';
import {
  extractLearnTabDecksAndCards,
  syncReviewedCardToLearnStorage,
} from './utils/learnDeckSync';

const CURRENT_STORAGE_VERSION = 'studyflow_fresh_student_v5_dynamic_milestones';
if (typeof window !== 'undefined') {
  try {
    const storedVersion = localStorage.getItem('studyflow_version');
    const storedUser = localStorage.getItem('studyflow_user');
    if (
      storedVersion !== CURRENT_STORAGE_VERSION ||
      (storedUser && (storedUser.includes('Alex') || storedUser.includes('alex')))
    ) {
      localStorage.removeItem('studyflow_user');
      localStorage.removeItem('studyflow_subjects');
      localStorage.removeItem('studyflow_exams');
      localStorage.removeItem('studyflow_tasks');
      localStorage.removeItem('studyflow_flashcards');
      localStorage.removeItem('studyflow_decks');
      localStorage.removeItem('studyflow_achievements');
      localStorage.setItem('studyflow_version', CURRENT_STORAGE_VERSION);
    }
  } catch (e) {
    // Ignore storage check errors
  }
}

export default function App() {
  // Auth state (starts logged in to immediately show working student dashboard, but can log out)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const saved = localStorage.getItem('studyflow_auth');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Dark mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('studyflow_theme');
    return saved ? saved === 'dark' : false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('studyflow_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('studyflow_theme', 'light');
    }
  }, [isDarkMode]);

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname === '/debug-test-suite' || window.location.hash === '#debug-test-suite') {
        return 'debug_test_suite';
      }
    }
    return 'home';
  });
  const [planSubTab, setPlanSubTab] = useState<PlanSubTab>('today');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Application Data States
  const [user, setUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('studyflow_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.name && !parsed.name.toLowerCase().includes('alex')) return parsed;
      }
      return initialUserProfile;
    } catch {
      return initialUserProfile;
    }
  });

  const [subjects, setSubjects] = useState<SubjectItem[]>(() => {
    try {
      const saved = localStorage.getItem('studyflow_subjects');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return initialSubjects;
    } catch {
      return initialSubjects;
    }
  });

  const [exams, setExams] = useState<Exam[]>(() => {
    try {
      const saved = localStorage.getItem('studyflow_exams');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((e: Exam) => ({
            ...e,
            chapters: Array.isArray(e.chapters) ? e.chapters : [],
          }));
        }
      }
      return initialExams;
    } catch {
      return initialExams;
    }
  });

  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    try {
      const saved = localStorage.getItem('studyflow_tasks');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return initialTasks;
    } catch {
      return initialTasks;
    }
  });

  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    try {
      const saved = localStorage.getItem('studyflow_achievements');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return initialAchievements;
    } catch {
      return initialAchievements;
    }
  });

  // Active Recall & Spaced Repetition State
  const [flashcards, setFlashcards] = useState<Flashcard[]>(() => {
    try {
      const saved = localStorage.getItem('studyflow_flashcards');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return initialFlashcards;
    } catch {
      return initialFlashcards;
    }
  });

  const [decks, setDecks] = useState<FlashcardDeck[]>(() => {
    try {
      const saved = localStorage.getItem('studyflow_decks');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return initialFlashcardDecks;
    } catch {
      return initialFlashcardDecks;
    }
  });

  // Dynamic sync trigger to immediately refresh when cards are rated or updated
  const [syncNonce, setSyncNonce] = useState<number>(0);

  useEffect(() => {
    const handleSync = () => setSyncNonce((n) => n + 1);
    window.addEventListener('storage', handleSync);
    window.addEventListener('studyflow_cards_updated', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('studyflow_cards_updated', handleSync);
    };
  }, []);

  // Dynamically extract and synchronize all recall decks & flashcards from the "Learn" tab chapters & sections
  const { learnDecks, learnCards } = useMemo(() => {
    return extractLearnTabDecksAndCards(exams);
  }, [exams, activeTab, syncNonce]);

  // Combined Decks: Custom created decks + Learn tab curriculum decks
  const combinedDecks = useMemo(() => {
    const customIds = new Set(decks.map((d) => d.id));
    const merged = [...decks];
    learnDecks.forEach((ld) => {
      if (!customIds.has(ld.id)) {
        merged.push(ld);
      }
    });
    return merged;
  }, [decks, learnDecks]);

  // Combined Flashcards: Custom created cards + Learn tab curriculum cards
  const combinedFlashcards = useMemo(() => {
    const customIds = new Set(flashcards.map((c) => c.id));
    const merged = [...flashcards];
    learnCards.forEach((lc) => {
      if (!customIds.has(lc.id)) {
        merged.push(lc);
      }
    });
    return merged;
  }, [flashcards, learnCards]);

  // Daily Metrics
  const [todayFocusMinutes, setTodayFocusMinutes] = useState<number>(0);
  const [todaySessionsCount, setTodaySessionsCount] = useState<number>(0);

  // Active Focus Task for quick start
  const [activeFocusTask, setActiveFocusTask] = useState<TaskItem | null>(null);

  // Modals
  const [examPrepExamId, setExamPrepExamId] = useState<string | null>(null);
  const [whyRationaleTask, setWhyRationaleTask] = useState<TaskItem | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState<boolean>(false);
  const [subjectModalType, setSubjectModalType] = useState<'study' | 'project'>('study');
  const [isAddExamModalOpen, setIsAddExamModalOpen] = useState<boolean>(false);

  // Recall Modals State
  const [activeRecallSession, setActiveRecallSession] = useState<{
    isOpen: boolean;
    cards: Flashcard[];
    deckTitle: string;
  }>({
    isOpen: false,
    cards: [],
    deckTitle: '',
  });

  const [isAddCardOpen, setIsAddCardOpen] = useState<boolean>(false);
  const [addCardDefaultDeckId, setAddCardDefaultDeckId] = useState<string | undefined>(undefined);
  const [isAddDeckOpen, setIsAddDeckOpen] = useState<boolean>(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);
  const [activeFolderSubject, setActiveFolderSubject] = useState<{
    subject: SubjectItem;
    exam?: Exam;
  } | null>(null);

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem('studyflow_auth', JSON.stringify(isAuthenticated));
  }, [isAuthenticated]);

  useEffect(() => {
    localStorage.setItem('studyflow_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('studyflow_subjects', JSON.stringify(subjects));
  }, [subjects]);

  useEffect(() => {
    localStorage.setItem('studyflow_exams', JSON.stringify(exams));
  }, [exams]);

  useEffect(() => {
    localStorage.setItem('studyflow_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('studyflow_flashcards', JSON.stringify(flashcards));
  }, [flashcards]);

  useEffect(() => {
    localStorage.setItem('studyflow_decks', JSON.stringify(decks));
  }, [decks]);

  // Handler: Update User Profile
  const handleUpdateUser = (updated: Partial<UserProfile>) => {
    setUser((prev) => {
      const next = { ...prev, ...updated };
      if (updated.name) {
        next.avatarLetter = updated.name.trim().charAt(0).toUpperCase() || 'S';
      }
      return next;
    });
  };

  // Handler: Reset All Data to fresh new student state
  const handleResetAllData = () => {
    try {
      localStorage.removeItem('studyflow_user');
      localStorage.removeItem('studyflow_subjects');
      localStorage.removeItem('studyflow_exams');
      localStorage.removeItem('studyflow_tasks');
      localStorage.removeItem('studyflow_flashcards');
      localStorage.removeItem('studyflow_decks');
      localStorage.removeItem('studyflow_achievements');
      localStorage.setItem('studyflow_version', CURRENT_STORAGE_VERSION);
    } catch (e) {}

    setUser(initialUserProfile);
    setSubjects(initialSubjects);
    setExams(initialExams);
    setTasks(initialTasks);
    setFlashcards(initialFlashcards);
    setDecks(initialFlashcardDecks);
    setAchievements(initialAchievements);
    setTodayFocusMinutes(0);
    setTodaySessionsCount(0);
    setActiveFocusTask(null);
    setActiveTab('home');
  };

  // Handler: Login
  const handleLogin = (email: string) => {
    setUser((prev) => ({ ...prev, email }));
    setIsAuthenticated(true);
    setActiveTab('home');
  };

  // Handler: Logout
  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  // Handler: Start Focus Task
  const handleStartFocusTask = (task?: TaskItem) => {
    if (task) {
      setActiveFocusTask(task);
    } else {
      setActiveFocusTask(null);
    }
    setActiveTab('focus');
  };

  // Handler: Start Focus Chapter (Direct link from workspace / chapter)
  const handleStartFocusChapter = (chapter: Chapter, examName?: string) => {
    const focusTask: TaskItem = {
      id: 'task-focus-' + Date.now(),
      title: `Learn ${chapter.name}`,
      subject: examName || activeFolderSubject?.subject.name || 'General',
      durationMin: 25,
      completed: false,
      dateCategory: 'today',
      chapter: chapter.name,
      chapterId: chapter.id,
      activityType: 'LEARN',
      priority: 'High Priority',
      type: 'Learn',
      whyRationale: `Focused study session for ${chapter.name}`,
    };
    setActiveFocusTask(focusTask);
    setActiveTab('focus');
  };

  // Handler: Schedule Targeted Revision Tasks (Multi-exam aware, preserving other exams and preventing duplicates)
  const handleScheduleRevisionTasks = (newTasks: Array<Omit<TaskItem, 'id' | 'completed'>>) => {
    if (!newTasks || newTasks.length === 0) return;

    // Identify which subject(s) are in the new batch
    const targetSubjects = new Set(newTasks.map((t) => (t.subject || '').toLowerCase().trim()));

    setTasks((prev) => {
      // 1. Keep ALL tasks for other subjects 100% intact (Requirement 5: Existing plans are not accidentally overwritten)
      const tasksForOtherSubjects = prev.filter(
        (t) => !targetSubjects.has((t.subject || '').toLowerCase().trim())
      );

      // 2. For the target subjects, keep any completed tasks for historical study tracking
      const completedTasks = prev.filter(
        (t) => targetSubjects.has((t.subject || '').toLowerCase().trim()) && t.completed
      );

      // 3. Format the new incoming tasks
      const createdTasks: TaskItem[] = newTasks.map((t, idx) => ({
        ...t,
        id: 'task-rev-' + Date.now() + '-' + idx,
        completed: false,
        durationMin: t.durationMin || 20,
        priority: t.priority || 'High Priority',
        type: t.type || (t.activityType === 'RECALL' ? 'Recall' : t.activityType === 'PRACTICE' ? 'Practice' : 'Learn'),
        dateCategory: t.dateCategory || 'today',
      }));

      // 4. Deduplicate new tasks among themselves
      const seen = new Set<string>();
      const uniqueNewTasks: TaskItem[] = [];
      createdTasks.forEach((task) => {
        const key = `${task.subject.toLowerCase()}|${(task.chapter || task.title).toLowerCase()}|${task.activityType || task.type}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueNewTasks.push(task);
        }
      });

      return [...uniqueNewTasks, ...tasksForOtherSubjects, ...completedTasks];
    });
  };

  // Handler: Focus Session Completed
  const handleSessionComplete = (session: FocusSession, result?: FocusCompletionResult) => {
    setTodayFocusMinutes((prev) => prev + session.durationMin);
    setTodaySessionsCount((prev) => prev + 1);

    // Add XP
    setUser((prev) => {
      const newXp = prev.xp + session.durationMin * 2 + 25;
      return {
        ...prev,
        xp: newXp,
      };
    });

    // Mark task complete if matching and update chapter state
    if (activeFocusTask) {
      setTasks((prev) =>
        prev.map((t) => (t.id === activeFocusTask.id ? { ...t, completed: true } : t))
      );

      const taskSubject = activeFocusTask.subject || '';
      const taskChapter = activeFocusTask.chapter || activeFocusTask.title || '';
      const studentConfidence = result?.confidence ?? 4;

      setExams((prevExams) =>
        prevExams.map((exam) => {
          const isExamMatch =
            exam.name.toLowerCase() === taskSubject.toLowerCase() ||
            exam.chapters.some(
              (c) =>
                c.name.toLowerCase() === taskChapter.toLowerCase() ||
                (activeFocusTask.chapterId && c.id === activeFocusTask.chapterId)
            );

          if (!isExamMatch) return exam;

          return {
            ...exam,
            chapters: exam.chapters.map((chap) => {
              const isTargetChap =
                (activeFocusTask.chapterId && chap.id === activeFocusTask.chapterId) ||
                chap.name.toLowerCase() === taskChapter.toLowerCase() ||
                taskChapter.toLowerCase().includes(chap.name.toLowerCase()) ||
                chap.name.toLowerCase().includes(taskChapter.toLowerCase());

              if (!isTargetChap) return chap;

              const prevMastery = chap.masteryPercentage ?? (chap.status === 'mastered' ? 95 : chap.status === 'ready' ? 80 : 50);
              const masteryDelta = studentConfidence >= 4 ? 12 : studentConfidence === 3 ? 6 : 2;
              const newMastery = Math.min(100, prevMastery + masteryDelta);

              let newStatus: ChapterStatus = chap.status;
              if (newMastery >= 90) newStatus = 'mastered';
              else if (newMastery >= 75) newStatus = 'ready';
              else if (newMastery >= 50) newStatus = 'needs_practice';
              else newStatus = 'learning';

              return {
                ...chap,
                confidence: studentConfidence,
                masteryPercentage: newMastery,
                status: newStatus,
                lastStudied: new Date().toISOString(),
              };
            }),
          };
        })
      );

      setActiveFocusTask(null);
    }
  };

  // Handler: Add / Edit Task
  const handleSaveTask = (taskData: Partial<TaskItem>) => {
    if (editingTask) {
      setTasks((prev) =>
        prev.map((t) => (t.id === editingTask.id ? ({ ...t, ...taskData } as TaskItem) : t))
      );
    } else {
      setTasks((prev) => [taskData as TaskItem, ...prev]);
    }
    setEditingTask(null);
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  // Handler: Add / Delete Subject
  const handleAddSubject = (newSub: Omit<SubjectItem, 'id'>) => {
    const subId = 'sub-' + Date.now();
    const created: SubjectItem = {
      ...newSub,
      id: subId,
    };
    setSubjects((prev) => [...prev, created]);

    // Also automatically create/link a corresponding Exam entry so the subject folder
    // has full chapter-level functionality, dynamic readiness tracking, and flashcards support
    const targetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const newExam: Exam = {
      id: 'exam-' + Date.now(),
      name: newSub.name,
      examDate: targetDate,
      daysLeft: 30,
      chapters: [],
      color: newSub.color || '#4f46e5',
    };
    setExams((prev) => [...prev, newExam]);
    setToastMessage(`Subject "${newSub.name}" added successfully.`);
  };

  const handleDeleteSubject = (subjectId: string) => {
    // 1. Identify the subject to delete
    const targetSubject = subjects.find(
      (s) => s.id === subjectId || s.name.toLowerCase() === subjectId.toLowerCase()
    );
    const targetSubjectName = targetSubject ? targetSubject.name : subjectId;
    const normSubjName = targetSubjectName.toLowerCase().trim();

    // 2. Identify all associated exams and chapter IDs
    const matchedExams = exams.filter(
      (e) =>
        e.id === subjectId ||
        e.name.toLowerCase().trim() === normSubjName ||
        (e as any).subjectId === subjectId
    );
    const matchedExamIds = new Set(matchedExams.map((e) => e.id));
    const allAssociatedChapterIds: string[] = [];
    const allAssociatedChapterNames: string[] = [];

    matchedExams.forEach((e) => {
      e.chapters.forEach((c) => {
        allAssociatedChapterIds.push(c.id);
        allAssociatedChapterNames.push(c.name.toLowerCase().trim());
      });
    });

    // 3. Remove subject from subjects
    setSubjects((prev) =>
      prev.filter(
        (s) => s.id !== subjectId && s.name.toLowerCase().trim() !== normSubjName
      )
    );

    // 4. Remove associated exams
    setExams((prev) =>
      prev.filter(
        (e) =>
          !matchedExamIds.has(e.id) &&
          e.id !== subjectId &&
          e.name.toLowerCase().trim() !== normSubjName
      )
    );

    // 5. Cascading deletion of tasks
    setTasks((prev) =>
      prev.filter((t) => {
        if (t.subject && t.subject.toLowerCase().trim() === normSubjName) return false;
        if ((t as any).subjectId && (t as any).subjectId === subjectId) return false;
        if (t.examId && matchedExamIds.has(t.examId)) return false;
        if (t.chapterId && allAssociatedChapterIds.includes(t.chapterId)) return false;
        if (t.chapter && allAssociatedChapterNames.includes(t.chapter.toLowerCase().trim())) return false;
        return true;
      })
    );

    // 6. Cascading deletion of flashcards & decks
    setFlashcards((prev) =>
      prev.filter((c) => {
        if (c.subject && c.subject.toLowerCase().trim() === normSubjName) return false;
        if ((c as any).subjectId && (c as any).subjectId === subjectId) return false;
        if ((c as any).chapterId && allAssociatedChapterIds.includes((c as any).chapterId)) return false;
        if (c.chapter && allAssociatedChapterNames.includes(c.chapter.toLowerCase().trim())) return false;
        return true;
      })
    );

    setDecks((prev) =>
      prev.filter((d) => {
        if (d.subject && d.subject.toLowerCase().trim() === normSubjName) return false;
        if (d.id === subjectId) return false;
        return true;
      })
    );

    // 7. Cascading cleanup of localStorage keys (child section progress, quiz attempts, checkpoint answers, review logs)
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        const lowerKey = key.toLowerCase();
        if (
          key.includes(subjectId) ||
          lowerKey.includes(normSubjName) ||
          allAssociatedChapterIds.some((cid) => key.includes(cid)) ||
          allAssociatedChapterNames.some((cname) => cname.length > 3 && lowerKey.includes(cname))
        ) {
          if (
            key !== 'studyflow_version' &&
            key !== 'studyflow_theme' &&
            key !== 'studyflow_auth' &&
            key !== 'studyflow_user'
          ) {
            keysToRemove.push(key);
          }
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (err) {
      console.warn('Error clearing localStorage for subject:', err);
    }

    // 8. Reset active views and redirect to "All Subjects" list
    setActiveFolderSubject(null);
    if (examPrepExamId && (matchedExamIds.has(examPrepExamId) || examPrepExamId === subjectId)) {
      setExamPrepExamId(null);
    }

    setToastMessage(`Subject "${targetSubjectName}" and all associated data deleted.`);
  };

  // Handler: Exam Management
  const handleAddExam = (newExam: Omit<Exam, 'id' | 'chapters'>) => {
    const created: Exam = {
      ...newExam,
      id: 'exam-' + Date.now(),
      chapters: [],
    };
    setExams((prev) => [...prev, created]);
    setExamPrepExamId(created.id);
  };

  const handleDeleteExam = (examId: string) => {
    setExams((prev) => prev.filter((e) => e.id !== examId));
    if (examPrepExamId === examId) {
      setExamPrepExamId(null);
    }
  };

  const handleUpdateExamDate = (examId: string, newDate: string) => {
    const target = new Date(newDate).getTime();
    const now = new Date().getTime();
    const diff = Math.max(0, Math.ceil((target - now) / (1000 * 60 * 60 * 24)));

    setExams((prev) =>
      prev.map((e) => (e.id === examId ? { ...e, examDate: newDate, daysLeft: diff } : e))
    );
  };

  // Handler: Exam Chapters (Document-First Chapter Setup)
  const handleAddChapter = (
    examIdOrSubject: string,
    chapterData: string | ChapterCreationData
  ) => {
    let targetExam = exams.find(
      (e) =>
        e.id === examIdOrSubject ||
        e.name.toLowerCase() === examIdOrSubject.toLowerCase() ||
        (e as any).subjectId === examIdOrSubject
    );

    const chapterName: string = typeof chapterData === 'string' ? chapterData : chapterData.name;
    const documentName = typeof chapterData === 'object' ? chapterData.documentName : undefined;
    const documentUrl = typeof chapterData === 'object' ? chapterData.documentUrl : undefined;
    const rawText = typeof chapterData === 'object' ? chapterData.rawText : undefined;
    const pageCount = typeof chapterData === 'object' ? chapterData.pageCount : undefined;
    const sourceType = typeof chapterData === 'object' ? chapterData.sourceType : undefined;

    const newChapId = 'chap-' + Date.now();
    const newChap: Chapter = {
      id: newChapId,
      name: chapterName,
      status: 'not_started' as ChapterStatus,
      topics: [],
      sections: [],
      milestones: [],
      documentName,
      documentUrl,
      rawText,
      pageCount,
      sourceType,
      materials: documentName
        ? [
            {
              id: `mat-${newChapId}`,
              type: sourceType === 'pasted_text' ? ('pasted_text' as const) : ('pdf' as const),
              title: documentName,
              content: rawText,
              fileName: documentName,
              fileData: documentUrl,
              uploadedAt: new Date().toISOString(),
            },
          ]
        : [],
    };

    let activeExamId = targetExam?.id;

    if (!targetExam) {
      // Find subject if exam doesn't exist yet and create exam on the fly!
      const targetSubj = subjects.find(
        (s) => s.id === examIdOrSubject || s.name.toLowerCase() === examIdOrSubject.toLowerCase()
      );
      const newExamId = 'exam-' + Date.now();
      activeExamId = newExamId;
      const newExam: Exam = {
        id: newExamId,
        name: targetSubj ? targetSubj.name : examIdOrSubject,
        examDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        daysLeft: 30,
        chapters: [newChap],
        color: targetSubj?.color || '#4f46e5',
      };
      targetExam = newExam;
      setExams((prev) => {
        const next = [...prev, newExam];
        try {
          localStorage.setItem('studyflow_exams', JSON.stringify(next));
        } catch (err) {
          console.warn('Failed to save exams', err);
        }
        return next;
      });
    } else {
      setExams((prev) => {
        const next = prev.map((e) => (e.id === activeExamId ? { ...e, chapters: [...e.chapters, newChap] } : e));
        try {
          localStorage.setItem('studyflow_exams', JSON.stringify(next));
        } catch (err) {
          console.warn('Failed to save exams', err);
        }
        return next;
      });
    }
  };

  const handleUpdateChapterSections = (
    chapterId: string,
    sections: Section[],
    examId?: string
  ) => {
    setExams((prev) => {
      const next = prev.map((e) =>
        !examId || e.id === examId || e.chapters.some((c) => c.id === chapterId)
          ? {
              ...e,
              chapters: e.chapters.map((c) =>
                c.id === chapterId ? { ...c, sections, milestones: sections } : c
              ),
            }
          : e
      );
      try {
        localStorage.setItem('studyflow_exams', JSON.stringify(next));
      } catch (err) {
        console.warn('Failed to save exams', err);
      }
      return next;
    });
  };

  const handleUpdateChapterDocument = (
    chapterId: string,
    docData: Partial<ChapterCreationData>,
    examId?: string
  ) => {
    setExams((prev) => {
      const next = prev.map((e) =>
        !examId || e.id === examId || e.chapters.some((c) => c.id === chapterId)
          ? {
              ...e,
              chapters: e.chapters.map((c) => {
                if (c.id !== chapterId) return c;
                const updatedMaterials = docData.documentName
                  ? [
                      ...(c.materials || []).filter((m) => m.title !== docData.documentName),
                      {
                        id: `mat-${Date.now()}`,
                        type: docData.sourceType === 'pasted_text' ? ('pasted_text' as const) : ('pdf' as const),
                        title: docData.documentName,
                        content: docData.rawText,
                        fileName: docData.documentName,
                        fileData: docData.documentUrl,
                        uploadedAt: new Date().toISOString(),
                      },
                    ]
                  : c.materials;

                return {
                  ...c,
                  ...docData,
                  materials: updatedMaterials,
                  ...(docData.milestones !== undefined
                    ? { milestones: docData.milestones, sections: docData.milestones }
                    : {}),
                };
              }),
            }
          : e
      );
      try {
        localStorage.setItem('studyflow_exams', JSON.stringify(next));
      } catch (err) {
        console.warn('Failed to save exams', err);
      }
      return next;
    });
  };

  const handleToggleChapterStatus = (examId: string, chapterId: string, status: ChapterStatus) => {
    setExams((prev) =>
      prev.map((e) =>
        e.id === examId
          ? {
              ...e,
              chapters: e.chapters.map((c) => (c.id === chapterId ? { ...c, status } : c)),
            }
          : e
      )
    );
  };

  const handleDeleteChapter = (examIdOrEmpty: string, chapterId: string) => {
    // 1. Locate chapter and its exam to get names for cascading cleanup
    let targetChapterName: string | undefined;
    let targetExamName: string | undefined;

    for (const e of exams) {
      const found = e.chapters.find((c) => c.id === chapterId);
      if (found) {
        targetChapterName = found.name;
        targetExamName = e.name;
        break;
      }
    }

    // 2. Remove chapter from exams (either by examId or across any exam that has this chapter)
    setExams((prev) =>
      prev.map((e) => {
        if (!examIdOrEmpty || e.id === examIdOrEmpty || e.chapters.some((c) => c.id === chapterId)) {
          return {
            ...e,
            chapters: e.chapters.filter((c) => c.id !== chapterId),
          };
        }
        return e;
      })
    );

    // 3. Remove all tasks associated with this chapter
    const normChapName = targetChapterName?.toLowerCase().trim();
    const normExamName = targetExamName?.toLowerCase().trim();

    setTasks((prev) =>
      prev.filter((t) => {
        if (t.chapterId && t.chapterId === chapterId) return false;
        if (normChapName && t.chapter && t.chapter.toLowerCase().trim() === normChapName) {
          return false;
        }
        if (
          normChapName &&
          normExamName &&
          t.title.toLowerCase().includes(normChapName) &&
          t.subject.toLowerCase().includes(normExamName)
        ) {
          return false;
        }
        return true;
      })
    );

    // 4. Remove all flashcards associated with this chapter
    setFlashcards((prev) =>
      prev.filter((c) => {
        if ((c as any).chapterId && (c as any).chapterId === chapterId) return false;
        if (normChapName && c.chapter && c.chapter.toLowerCase().trim() === normChapName) {
          return false;
        }
        return true;
      })
    );

    // 5. Clean up child section progress, quiz attempts, checkpoint answers, and review logs from localStorage
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        const lowerKey = key.toLowerCase();
        if (
          key.includes(chapterId) ||
          (normChapName && normChapName.length > 3 && lowerKey.includes(normChapName))
        ) {
          if (
            key !== 'studyflow_version' &&
            key !== 'studyflow_theme' &&
            key !== 'studyflow_auth' &&
            key !== 'studyflow_user'
          ) {
            keysToRemove.push(key);
          }
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (err) {
      console.warn('Error clearing localStorage for chapter:', err);
    }

    // 6. If activeFolderSubject was open with this chapter / exam, update it
    setActiveFolderSubject((prev) => {
      if (!prev) return null;
      if (prev.exam) {
        return {
          ...prev,
          exam: {
            ...prev.exam,
            chapters: prev.exam.chapters.filter((c) => c.id !== chapterId),
          },
        };
      }
      return prev;
    });

    // 7. Show toast notification
    setToastMessage(`Chapter "${targetChapterName || 'Chapter'}" deleted successfully.`);
  };

  const handleDeleteTopic = (topicId: string, chapterId?: string, examId?: string) => {
    let targetTopicTitle: string | undefined;
    let targetChapterName: string | undefined;

    // Find the topic title and chapter
    for (const e of exams) {
      for (const c of e.chapters) {
        if (!chapterId || c.id === chapterId) {
          const t = c.topics?.find((top) => top.id === topicId);
          if (t) {
            targetTopicTitle = t.title;
            targetChapterName = c.name;
            break;
          }
        }
      }
      if (targetTopicTitle) break;
    }

    // 1. Remove topic from chapter in exams
    setExams((prev) =>
      prev.map((e) => {
        if (
          !examId ||
          e.id === examId ||
          e.chapters.some((c) => c.id === chapterId || c.topics?.some((t) => t.id === topicId))
        ) {
          return {
            ...e,
            chapters: e.chapters.map((c) => {
              if (c.id === chapterId || c.topics?.some((t) => t.id === topicId)) {
                return {
                  ...c,
                  topics: (c.topics || []).filter((t) => t.id !== topicId),
                };
              }
              return c;
            }),
          };
        }
        return e;
      })
    );

    // 2. Remove tasks specifically belonging to this topic (if any)
    if (targetTopicTitle) {
      const normTopic = targetTopicTitle.toLowerCase().trim();
      const normChap = targetChapterName?.toLowerCase().trim();
      setTasks((prev) =>
        prev.filter((t) => {
          const isSameChap =
            (chapterId && t.chapterId === chapterId) ||
            (normChap && t.chapter && t.chapter.toLowerCase().trim() === normChap);
          if (isSameChap) {
            if (
              t.title.toLowerCase().includes(normTopic) ||
              (t.description && t.description.toLowerCase().includes(normTopic))
            ) {
              return false;
            }
          }
          return true;
        })
      );

      // 3. Remove flashcards specifically belonging to this topic (if any)
      setFlashcards((prev) =>
        prev.filter((c) => {
          const isSameChap =
            (chapterId && (c as any).chapterId === chapterId) ||
            (normChap && c.chapter && c.chapter.toLowerCase().trim() === normChap);
          if (isSameChap) {
            if (
              c.front.toLowerCase().includes(normTopic) ||
              (c.notes && c.notes.toLowerCase().includes(normTopic))
            ) {
              return false;
            }
          }
          return true;
        })
      );
    }

    // 4. Show toast notification
    setToastMessage(`Topic "${targetTopicTitle || 'Topic'}" deleted successfully.`);
  };

  // ================= Active Recall & Spaced Repetition Handlers =================
  const handleRateCard = (cardId: string, rating: RecallRating, updatedFields?: Partial<Flashcard>) => {
    const existingCard =
      combinedFlashcards.find((c) => c.id === cardId) ||
      flashcards.find((c) => c.id === cardId) ||
      ({} as Flashcard);
    const updatedParams = updatedFields || calculateNextReview(existingCard, rating);

    setFlashcards((prev) => {
      const exists = prev.some((c) => c.id === cardId);
      if (exists) {
        return prev.map((card) => {
          if (card.id !== cardId) return card;
          return {
            ...card,
            ...updatedParams,
          };
        });
      }
      return prev;
    });

    // Bidirectional sync: sync SM-2 review parameters back to Learn Tab storage
    syncReviewedCardToLearnStorage(cardId, updatedParams, rating);

    // Award student XP for active recall effort
    setUser((prev) => ({
      ...prev,
      xp: prev.xp + 10,
    }));
  };

  const handleStartRecallSession = (deckId?: string, subject?: string) => {
    let targetCards: Flashcard[] = [];
    let title = 'All Due Cards';

    if (deckId) {
      const deck = combinedDecks.find((d) => d.id === deckId);
      title = deck ? (deck.title || (deck as unknown as { name?: string }).name || 'Deck Practice') : 'Deck Practice';
      targetCards = combinedFlashcards.filter((c) => c.deckId === deckId);
    } else if (subject) {
      title = `${subject} Practice`;
      targetCards = combinedFlashcards.filter((c) => c.subject.toLowerCase() === subject.toLowerCase());
      if (targetCards.length === 0) {
        targetCards = combinedFlashcards;
      }
    } else {
      targetCards = combinedFlashcards.filter(isCardDue);
      if (targetCards.length === 0) {
        targetCards = combinedFlashcards;
      }
    }

    setActiveRecallSession({
      isOpen: true,
      cards: targetCards,
      deckTitle: title,
    });
  };

  const handleGenerateAIFlashcards = (topic: string, targetDeckId: string) => {
    const targetDeck = combinedDecks.find((d) => d.id === targetDeckId) || combinedDecks[0];
    const subject = targetDeck ? targetDeck.subject : 'General';

    const newGeneratedCards: Flashcard[] = [
      {
        id: 'fc-ai-' + Date.now() + '-1',
        deckId: targetDeckId,
        subject,
        chapter: topic,
        front: `Define and explain the core concept of "${topic}".`,
        back: `Core concepts of ${topic}:\n\n1. Foundational principle and definition\n2. Key relationships and governing conditions\n3. High-yield applications in exam questions`,
        interval: 1,
        repetitions: 0,
        easeFactor: 2.5,
        dueDate: new Date().toISOString(),
        box: 1,
        status: 'learning',
      },
      {
        id: 'fc-ai-' + Date.now() + '-2',
        deckId: targetDeckId,
        subject,
        chapter: topic,
        front: `What is the most critical distinction or exam pitfall regarding "${topic}"?`,
        back: `Key distinction & common error:\n\nAlways check units, sign conventions, and validity assumptions before applying formulas for ${topic}.`,
        interval: 1,
        repetitions: 0,
        easeFactor: 2.5,
        dueDate: new Date().toISOString(),
        box: 1,
        status: 'learning',
      },
      {
        id: 'fc-ai-' + Date.now() + '-3',
        deckId: targetDeckId,
        subject,
        chapter: topic,
        front: `Provide a step-by-step problem-solving strategy for "${topic}".`,
        back: `Problem-solving methodology:\n\nStep 1: Identify given parameters and target variable\nStep 2: Select the governing equation\nStep 3: Substitute, solve, and check units.`,
        interval: 1,
        repetitions: 0,
        easeFactor: 2.5,
        dueDate: new Date().toISOString(),
        box: 1,
        status: 'learning',
      },
    ];

    setFlashcards((prev) => [...newGeneratedCards, ...prev]);
  };

  const handleAddCard = (newCardData: Omit<Flashcard, 'id' | 'interval' | 'repetitions' | 'easeFactor' | 'status' | 'box'>) => {
    const newCard: Flashcard = {
      ...newCardData,
      id: 'card-' + Date.now(),
      interval: 0,
      repetitions: 0,
      easeFactor: 2.5,
      status: 'learning',
      box: 1,
      dueDate: new Date().toISOString(),
    };
    setFlashcards((prev) => [newCard, ...prev]);
  };

  const handleDeleteCard = (cardId: string) => {
    setFlashcards((prev) => prev.filter((c) => c.id !== cardId));
  };

  const handleAddDeck = (deckData: Omit<FlashcardDeck, 'id' | 'totalCards' | 'dueCardsCount' | 'masteredCount'>) => {
    const newDeck: FlashcardDeck = {
      ...deckData,
      id: 'deck-' + Date.now(),
      totalCards: 0,
      dueCardsCount: 0,
      masteredCount: 0,
    };
    setDecks((prev) => [...prev, newDeck]);
  };

  const handleDeleteDeck = (deckId: string) => {
    setDecks((prev) => prev.filter((d) => d.id !== deckId));
    setFlashcards((prev) => prev.filter((c) => c.deckId !== deckId));
  };

  // Earliest upcoming exam (sorted chronologically by daysLeft / date)
  const sortedExams = useMemo(() => {
    return [...exams].sort((a, b) => {
      const daysA = a.daysLeft ?? (a.examDate ? Math.ceil((new Date(a.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 999);
      const daysB = b.daysLeft ?? (b.examDate ? Math.ceil((new Date(b.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 999);
      return daysA - daysB || a.examDate.localeCompare(b.examDate);
    });
  }, [exams]);

  const nextExam = sortedExams[0] || null;

  // Next Task for Home Screen:
  // Intelligently prioritizes:
  // 1. Uncompleted tasks only
  // 2. Today's tasks first (dateCategory === 'today')
  // 3. Earlier exams receive higher priority (fewer daysLeft)
  // 4. Priority tier: 'High Priority' > 'Medium' > 'Normal'
  const nextTask = useMemo(() => {
    const uncompleted = (tasks || []).filter((t) => !t.completed);
    if (uncompleted.length === 0) return null;

    const getExamDaysLeft = (task: TaskItem): number => {
      const subj = (task.subject || '').toLowerCase().trim();
      const matched = exams.find((e) => {
        const eName = e.name.toLowerCase().trim();
        return eName === subj || subj.includes(eName) || eName.includes(subj);
      });
      return matched?.daysLeft ?? 999;
    };

    const getPriorityWeight = (priority?: string): number => {
      if (priority === 'High Priority') return 0;
      if (priority === 'Medium') return 1;
      return 2;
    };

    const sorted = [...uncompleted].sort((a, b) => {
      // 1. Today tasks come before upcoming
      const isTodayA = a.dateCategory === 'today' ? 0 : 1;
      const isTodayB = b.dateCategory === 'today' ? 0 : 1;
      if (isTodayA !== isTodayB) return isTodayA - isTodayB;

      // 2. Earlier exams receive higher priority (fewer daysLeft)
      const daysA = getExamDaysLeft(a);
      const daysB = getExamDaysLeft(b);
      if (daysA !== daysB) return daysA - daysB;

      // 3. Priority tier
      const pA = getPriorityWeight(a.priority);
      const pB = getPriorityWeight(b.priority);
      if (pA !== pB) return pA - pB;

      return 0;
    });

    return sorted[0] || null;
  }, [tasks, exams]);

  const todayTasksCount = (tasks || []).filter((t) => t.dateCategory === 'today').length;
  const todayCompletedCount = (tasks || []).filter((t) => t.dateCategory === 'today' && t.completed).length;
  const dueFlashcardsCount = (combinedFlashcards || []).filter(isCardDue).length;

  // If not authenticated, render the exact Figma Login Screen
  if (!isAuthenticated) {
    return <AuthScreen user={user} onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Top App Bar & Screen Selector */}
      <Header
        streakDays={user.streakDays}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        onLogout={handleLogout}
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        onOpenExamPrep={(examId) => setExamPrepExamId(examId || exams[0]?.id || 'exam-science')}
        onOpenGuide={() => setIsGuideModalOpen(true)}
      />

      {/* Main Content Area framed gracefully */}
      <main className={`flex-1 w-full mx-auto px-4 pt-4 pb-20 ${activeFolderSubject && activeTab === 'home' ? 'max-w-4xl' : 'max-w-lg'}`}>
        {activeTab === 'home' &&
          (activeFolderSubject ? (
            <SubjectFolderWorkspace
              subjectId={activeFolderSubject.subject.id}
              subjectName={activeFolderSubject.subject.name}
              subjectColor={activeFolderSubject.subject.color}
              exam={
                activeFolderSubject.exam ||
                exams.find(
                  (e) =>
                    e.name.toLowerCase() ===
                    activeFolderSubject.subject.name.toLowerCase()
                )
              }
              chapters={
                (
                  activeFolderSubject.exam ||
                  exams.find(
                    (e) =>
                      e.name.toLowerCase() ===
                      activeFolderSubject.subject.name.toLowerCase()
                  )
                )?.chapters || []
              }
              decks={combinedDecks}
              flashcards={combinedFlashcards}
              onBack={() => setActiveFolderSubject(null)}
              onUpdateChapterNotes={(chapterId, notes, rawNotesText, handwrittenNotes) => {
                const currentExam =
                  activeFolderSubject.exam ||
                  exams.find(
                    (e) =>
                      e.name.toLowerCase() ===
                      activeFolderSubject.subject.name.toLowerCase()
                  );
                if (currentExam) {
                  setExams((prev) =>
                    prev.map((e) =>
                      e.id === currentExam.id
                        ? {
                            ...e,
                            chapters: e.chapters.map((c) =>
                              c.id === chapterId
                                ? {
                                    ...c,
                                    aiNotes: notes,
                                    notes:
                                      rawNotesText !== undefined
                                        ? rawNotesText
                                        : (notes?.summary || c.notes),
                                    handwrittenNotes:
                                      handwrittenNotes !== undefined
                                        ? handwrittenNotes
                                        : c.handwrittenNotes,
                                  }
                                : c
                            ),
                          }
                        : e
                    )
                  );
                }
              }}
              onUpdateChapterStatus={(chapterId, status, score) => {
                const currentExam =
                  activeFolderSubject.exam ||
                  exams.find(
                    (e) =>
                      e.name.toLowerCase() ===
                      activeFolderSubject.subject.name.toLowerCase()
                  );
                if (currentExam) {
                  setExams((prev) =>
                    prev.map((e) =>
                      e.id === currentExam.id
                        ? {
                            ...e,
                            chapters: e.chapters.map((c) =>
                              c.id === chapterId
                                ? {
                                    ...c,
                                    status,
                                    lastTestScore: score ?? c.lastTestScore,
                                    lastTestDate: new Date().toISOString(),
                                    lastStudied: new Date().toISOString(),
                                    masteryPercentage: score !== undefined ? Math.max(c.masteryPercentage ?? 0, score) : c.masteryPercentage,
                                    verbalRecallScore: score ?? c.verbalRecallScore,
                                  }
                                : c
                            ),
                          }
                        : e
                    )
                  );
                }
              }}
              onAddFlashcards={(newCards) => {
                const formatted: Flashcard[] = newCards.map((c, idx) => ({
                  ...c,
                  id: 'card-' + Date.now() + '-' + idx,
                  interval: 0,
                  repetitions: 0,
                  easeFactor: 2.5,
                  status: 'learning',
                  box: 1,
                  dueDate: new Date().toISOString(),
                }));
                setFlashcards((prev) => [...formatted, ...prev]);
              }}
              onUpdateChapterMaterials={(chapterId, materials) => {
                const currentExam =
                  activeFolderSubject.exam ||
                  exams.find(
                    (e) =>
                      e.name.toLowerCase() ===
                      activeFolderSubject.subject.name.toLowerCase()
                  );
                if (currentExam) {
                  setExams((prev) =>
                    prev.map((e) =>
                      e.id === currentExam.id
                        ? {
                            ...e,
                            chapters: e.chapters.map((c) =>
                              c.id === chapterId ? { ...c, materials } : c
                            ),
                          }
                        : e
                    )
                  );
                }
              }}
              onUpdateExamDate={(examId, newDate) => handleUpdateExamDate(examId, newDate)}
              onAddChapter={(examId, chapterData) => handleAddChapter(examId, chapterData)}
              onRateCard={handleRateCard}
              onStartFocusChapter={(chapter, examName) => {
                setActiveFolderSubject(null);
                handleStartFocusChapter(chapter, examName);
              }}
              onNavigateToTab={(tab) => {
                setActiveFolderSubject(null);
                setActiveTab(tab);
              }}
              onScheduleRevisionTasks={handleScheduleRevisionTasks}
              onDeleteChapter={(chapId, exId) => handleDeleteChapter(exId || '', chapId)}
              onDeleteSubject={handleDeleteSubject}
              onAddSubject={() => {
                setSubjectModalType('study');
                setIsSubjectModalOpen(true);
              }}
            />
          ) : (
            <HomeScreen
              user={user}
              subjects={subjects}
              exams={exams}
              tasks={tasks}
              nextTask={nextTask}
              todayProgress={{
                tasksDone: todayCompletedCount,
                tasksTotal: todayTasksCount,
                focusMinutes: todayFocusMinutes,
                sessionsCount: todaySessionsCount,
              }}
              nextExam={nextExam}
              flashcards={combinedFlashcards}
              decks={combinedDecks}
              onOpenSubjectFolder={(subj, exam) => {
                setActiveFocusTask({
                  id: 'task-subj-learn-' + Date.now(),
                  title: `Learn ${subj.name}`,
                  subject: subj.name,
                  durationMin: 25,
                  completed: false,
                  dateCategory: 'today',
                  activityType: 'LEARN',
                  priority: 'High Priority',
                  type: 'Learn',
                });
                setActiveTab('focus');
              }}
              onAddSubject={() => {
                setSubjectModalType('study');
                setIsSubjectModalOpen(true);
              }}
              onStartFocusTask={handleStartFocusTask}
              onOpenWhyRationale={(task) => setWhyRationaleTask(task)}
              onOpenExamPrep={(examId) =>
                setExamPrepExamId(examId || exams[0]?.id)
              }
              onStartRecallSession={(deckId, subject) => handleStartRecallSession(deckId, subject)}
              onNavigateToRecall={() => setActiveTab('recall')}
              onNavigateToPlan={() => setActiveTab('plan')}
              onOpenGuide={() => setIsGuideModalOpen(true)}
            />
          ))}

        {activeTab === 'focus' && (
          <FocusScreen
            initialTask={activeFocusTask}
            tasks={tasks}
            subjects={subjects}
            exams={exams}
            flashcards={combinedFlashcards}
            decks={combinedDecks}
            onSessionComplete={handleSessionComplete}
            onClearInitialTask={() => setActiveFocusTask(null)}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onStartRecallAction={(subject, chapter) => {
              handleStartRecallSession(undefined, subject);
            }}
            onStartPracticeAction={(task) => {
              if (task) {
                handleStartFocusTask({
                  ...task,
                  id: 'task-practice-' + Date.now(),
                  title: `Targeted Practice: ${task.chapter || task.title}`,
                  type: 'Practice',
                  activityType: 'PRACTICE',
                  durationMin: 20,
                  dateCategory: 'today',
                  completed: false,
                });
              } else {
                setActiveTab('plan');
              }
            }}
            onUpdateChapterNotes={(chapterId, notes, rawNotesText, handwrittenNotes, examId) => {
              setExams((prev) =>
                prev.map((e) =>
                  (!examId || e.id === examId || e.chapters.some((c) => c.id === chapterId))
                    ? {
                        ...e,
                        chapters: e.chapters.map((c) =>
                          c.id === chapterId
                            ? {
                                ...c,
                                aiNotes: notes,
                                notes: rawNotesText !== undefined ? rawNotesText : (notes?.summary || c.notes),
                                handwrittenNotes: handwrittenNotes !== undefined ? handwrittenNotes : c.handwrittenNotes,
                              }
                            : c
                        ),
                      }
                    : e
                )
              );
            }}
            onUpdateChapterStatus={(chapterId, status, score, examId) => {
              setExams((prev) =>
                prev.map((e) =>
                  (!examId || e.id === examId || e.chapters.some((c) => c.id === chapterId))
                    ? {
                        ...e,
                        chapters: e.chapters.map((c) =>
                          c.id === chapterId
                            ? {
                                ...c,
                                status,
                                lastTestScore: score ?? c.lastTestScore,
                                lastTestDate: new Date().toISOString(),
                                lastStudied: new Date().toISOString(),
                                masteryPercentage: score !== undefined ? Math.max(c.masteryPercentage ?? 0, score) : c.masteryPercentage,
                                verbalRecallScore: score ?? c.verbalRecallScore,
                              }
                            : c
                        ),
                      }
                    : e
                )
              );
            }}
            onUpdateChapterMaterials={(chapterId, materials, examId) => {
              setExams((prev) =>
                prev.map((e) =>
                  (!examId || e.id === examId || e.chapters.some((c) => c.id === chapterId))
                    ? {
                        ...e,
                        chapters: e.chapters.map((c) =>
                          c.id === chapterId ? { ...c, materials } : c
                        ),
                      }
                    : e
                )
              );
            }}
            onUpdateChapterTopics={(chapterId, topics, examId) => {
              setExams((prev) =>
                prev.map((e) =>
                  (!examId || e.id === examId || e.chapters.some((c) => c.id === chapterId))
                    ? {
                        ...e,
                        chapters: e.chapters.map((c) =>
                          c.id === chapterId ? { ...c, topics } : c
                        ),
                      }
                    : e
                )
              );
            }}
            onAddFlashcards={(newCards) => {
              const formatted: Flashcard[] = newCards.map((c, idx) => ({
                ...c,
                id: 'card-' + Date.now() + '-' + idx,
                interval: 0,
                repetitions: 0,
                easeFactor: 2.5,
                status: 'learning',
                box: 1,
                dueDate: new Date().toISOString(),
              }));
              setFlashcards((prev) => [...formatted, ...prev]);
            }}
            onAddChapter={(examId, chapterData) => handleAddChapter(examId, chapterData)}
            onUpdateChapterSections={handleUpdateChapterSections}
            onUpdateChapterDocument={handleUpdateChapterDocument}
            onDeleteChapter={(chapId, exId) => handleDeleteChapter(exId || '', chapId)}
            onDeleteTopic={handleDeleteTopic}
            onDeleteSubject={handleDeleteSubject}
            onAddSubject={() => {
              setSubjectModalType('study');
              setIsSubjectModalOpen(true);
            }}
          />
        )}

        {activeTab === 'recall' && (
          <RecallScreen
            cards={combinedFlashcards}
            flashcards={combinedFlashcards}
            decks={combinedDecks}
            subjects={subjects}
            onStartRecallSession={(deckId, subject) => handleStartRecallSession(deckId, subject)}
            onOpenAddCard={(deckId) => {
              setAddCardDefaultDeckId(deckId);
              setIsAddCardOpen(true);
            }}
            onOpenAddDeck={() => setIsAddDeckOpen(true)}
            onDeleteDeck={handleDeleteDeck}
            onDeleteCard={handleDeleteCard}
            onGenerateAIFlashcards={handleGenerateAIFlashcards}
            onAddFlashcards={(newCards) => {
              const formatted: Flashcard[] = newCards.map((c, idx) => ({
                ...c,
                id: 'card-' + Date.now() + '-' + idx,
                interval: 0,
                repetitions: 0,
                easeFactor: 2.5,
                status: 'learning',
                box: 1,
                dueDate: new Date().toISOString(),
              }));
              setFlashcards((prev) => [...formatted, ...prev]);
            }}
          />
        )}

        {activeTab === 'plan' && (
          <PlanScreen
            tasks={tasks}
            subjects={subjects}
            exams={exams}
            onToggleTask={(taskId) => {
              setTasks((prev) =>
                prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
              );
            }}
            onStartTask={handleStartFocusTask}
            onAddTask={(task) => handleSaveTask(task)}
            onAddExam={handleAddExam}
            onUpdateExam={(updatedExam) => {
              setExams((prev) =>
                prev.map((e) => (e.id === updatedExam.id ? updatedExam : e))
              );
            }}
            onToggleChapterStatus={(examId, chapterId, status) => {
              if (status) {
                handleToggleChapterStatus(examId, chapterId, status);
              }
            }}
            onAddChapter={handleAddChapter}
            onScheduleSpacedPlan={handleScheduleRevisionTasks}
            onGenerateRecallCards={(newCards) => {
              const formatted: Flashcard[] = newCards.map((c, idx) => ({
                id: 'card-plan-' + Date.now() + '-' + idx,
                deckId: decks[0]?.id || 'deck-default',
                question: c.question,
                answer: c.answer,
                front: c.question,
                back: c.answer,
                subject: c.subject,
                chapter: c.chapter,
                interval: 0,
                repetitions: 0,
                easeFactor: 2.5,
                status: 'learning',
                box: 1,
                dueDate: new Date().toISOString(),
                createdAt: new Date().toISOString(),
              }));
              setFlashcards((prev) => {
                const existingQuestions = new Set(
                  prev.map((c) => (c.front || '').toLowerCase().trim())
                );
                const uniqueNewCards = formatted.filter(
                  (c) =>
                    !existingQuestions.has(
                      (c.front || '').toLowerCase().trim()
                    )
                );
                return [...uniqueNewCards, ...prev];
              });
            }}
            onAddExamWithChapters={(examData, generatedTasks) => {
              const daysLeft = Math.max(
                0,
                Math.ceil(
                  (new Date(examData.examDate).getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24)
                )
              );
              const newExam: Exam = {
                id: 'exam-' + Date.now(),
                name: examData.name,
                examDate: examData.examDate,
                daysLeft,
                chapters: examData.chapters,
                color: examData.color || '#4f46e5',
              };
              setExams((prev) => {
                const existsIndex = prev.findIndex(
                  (e) => e.name.toLowerCase() === examData.name.toLowerCase()
                );
                let updatedList: Exam[];
                if (existsIndex >= 0) {
                  updatedList = [...prev];
                  updatedList[existsIndex] = {
                    ...updatedList[existsIndex],
                    ...newExam,
                    id: updatedList[existsIndex].id, // preserve existing id
                  };
                } else {
                  updatedList = [...prev, newExam];
                }
                return updatedList.sort(
                  (a, b) =>
                    (a.daysLeft ?? 999) - (b.daysLeft ?? 999) ||
                    a.examDate.localeCompare(b.examDate)
                );
              });

              // Also register this subject in subjects state if not already present
              setSubjects((prev) => {
                const exists = prev.some(
                  (s) => s.name.toLowerCase() === examData.name.toLowerCase()
                );
                if (exists) return prev;
                return [
                  ...prev,
                  {
                    id: 'sub-' + Date.now(),
                    name: examData.name,
                    color: examData.color || '#4f46e5',
                    type: 'study',
                  },
                ];
              });

              if (generatedTasks && generatedTasks.length > 0) {
                handleScheduleRevisionTasks(generatedTasks);
              }
            }}
            onDeleteChapter={handleDeleteChapter}
          />
        )}

        {activeTab === 'progress' && (
          <ProgressScreen
            exams={exams}
            streakDays={user.streakDays}
            achievements={achievements}
            flashcards={combinedFlashcards}
            tasks={tasks}
            onOpenExamPrep={(examId) => setExamPrepExamId(examId)}
            onStartRecall={() => handleStartRecallSession()}
            onStartFocusTask={handleStartFocusTask}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileScreen
            user={user}
            exams={exams}
            subjects={subjects}
            onOpenExamPrep={(examId) => setExamPrepExamId(examId)}
            onUpdateUser={handleUpdateUser}
            onResetData={handleResetAllData}
          />
        )}

        {activeTab === 'debug_test_suite' && (
          <div className="pb-20">
            <DevTestSuitePage />
          </div>
        )}
      </main>

      {/* Bottom 5-Tab Navigation Bar with Recall Badge matching Figma */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={(tab) => {
          if (tab === 'home' && activeTab === 'home') {
            setActiveFolderSubject(null);
          }
          setActiveTab(tab);
        }}
        dueCardsCount={dueFlashcardsCount}
      />

      {/* Spaced Repetition Interactive Active Recall Session Modal */}
      <ActiveRecallSessionModal
        isOpen={activeRecallSession.isOpen}
        cards={activeRecallSession.cards || []}
        deckTitle={activeRecallSession.deckTitle || 'Practice Session'}
        onClose={() => setActiveRecallSession((prev) => ({ ...prev, isOpen: false }))}
        onCardReviewed={(cardId, updated, rating) => handleRateCard(cardId, rating, updated)}
        onRateCard={handleRateCard}
      />

      {/* Add Card Modal */}
      <AddCardModal
        isOpen={isAddCardOpen}
        onClose={() => setIsAddCardOpen(false)}
        decks={decks}
        defaultDeckId={addCardDefaultDeckId}
        onAddCard={handleAddCard}
      />

      {/* Add Deck Modal */}
      <AddDeckModal
        isOpen={isAddDeckOpen}
        onClose={() => setIsAddDeckOpen(false)}
        subjects={subjects}
        onAddDeck={handleAddDeck}
      />

      {/* Modals */}
      <ExamPrepModal
        isOpen={examPrepExamId !== null}
        onClose={() => setExamPrepExamId(null)}
        exams={exams}
        selectedExamId={examPrepExamId || exams[0]?.id || ''}
        onSelectExam={(id) => setExamPrepExamId(id)}
        onUpdateExamDate={handleUpdateExamDate}
        onDeleteExam={handleDeleteExam}
        onAddChapter={handleAddChapter}
        onToggleChapterStatus={handleToggleChapterStatus}
        onDeleteChapter={handleDeleteChapter}
        onAddExam={() => setIsAddExamModalOpen(true)}
        decks={combinedDecks}
        flashcards={combinedFlashcards}
        tasks={tasks}
        onAddFlashcards={(newCards) => {
          const formatted: Flashcard[] = newCards.map((c, idx) => ({
            ...c,
            id: 'card-' + Date.now() + '-' + idx,
            interval: 0,
            repetitions: 0,
            easeFactor: 2.5,
            status: 'learning',
            box: 1,
            dueDate: new Date().toISOString(),
          }));
          setFlashcards((prev) => [...formatted, ...prev]);
        }}
        onScheduleRevisionTasks={(newTasks) => {
          const formatted: TaskItem[] = newTasks.map((t, idx) => ({
            ...t,
            id: 'task-' + Date.now() + '-' + idx,
            completed: false,
          }));
          setTasks((prev) => [...formatted, ...prev]);
        }}
        onUpdateChapterNotes={(examId, chapterId, notes) => {
          setExams((prev) =>
            prev.map((e) =>
              e.id === examId
                ? {
                    ...e,
                    chapters: e.chapters.map((c) => (c.id === chapterId ? { ...c, aiNotes: notes } : c)),
                  }
                : e
            )
          );
        }}
        onUpdateChapterMaterials={(examId, chapterId, materials) => {
          setExams((prev) =>
            prev.map((e) =>
              e.id === examId
                ? {
                    ...e,
                    chapters: e.chapters.map((c) => (c.id === chapterId ? { ...c, materials } : c)),
                  }
                : e
            )
          );
        }}
        onUpdateNoteSpacedReview={(examId, chapterId, review) => {
          setExams((prev) =>
            prev.map((e) =>
              e.id === examId
                ? {
                    ...e,
                    chapters: e.chapters.map((c) => (c.id === chapterId ? { ...c, noteSpacedReview: review } : c)),
                  }
                : e
            )
          );
        }}
        onUpdateChapterStatusAndScore={(examId, chapterId, status, score) => {
          setExams((prev) =>
            prev.map((e) =>
              e.id === examId
                ? {
                    ...e,
                    chapters: e.chapters.map((c) =>
                      c.id === chapterId
                        ? {
                            ...c,
                            status,
                            lastTestScore: score ?? c.lastTestScore,
                            lastTestDate: new Date().toISOString(),
                            lastStudied: new Date().toISOString(),
                            masteryPercentage: score !== undefined ? Math.max(c.masteryPercentage ?? 0, score) : c.masteryPercentage,
                            verbalRecallScore: score ?? c.verbalRecallScore,
                          }
                        : c
                    ),
                  }
                : e
            )
          );
        }}
        onStartFocusChapter={(chap, examName) => {
          setActiveFocusTask({
            id: 'task-' + Date.now(),
            title: chap.name,
            subject: examName,
            durationMin: 25,
            priority: 'High Priority',
            type: 'Revise',
            dateCategory: 'today',
            completed: false,
          });
          setActiveTab('focus');
        }}
        onStartRecallSubject={(subj) => handleStartRecallSession(undefined, subj)}
        onNavigateToTab={(tab) => setActiveTab(tab)}
        onOpenGuide={() => setIsGuideModalOpen(true)}
      />

      <WhyThisTaskModal
        isOpen={whyRationaleTask !== null}
        onClose={() => setWhyRationaleTask(null)}
        task={whyRationaleTask}
        onStartFocus={handleStartFocusTask}
      />

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSaveTask={handleSaveTask}
        subjects={subjects}
        editingTask={editingTask}
      />

      <SubjectModal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        defaultType={subjectModalType}
        onAddSubject={handleAddSubject}
      />

      <AddExamModal
        isOpen={isAddExamModalOpen}
        onClose={() => setIsAddExamModalOpen(false)}
        subjects={subjects}
        exams={exams}
        onAddExamWithChapters={(examData, generatedTasks) => {
          const daysLeft = Math.max(
            0,
            Math.ceil(
              (new Date(examData.examDate).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24)
            )
          );
          const newExam: Exam = {
            id: 'exam-' + Date.now(),
            name: examData.name,
            examDate: examData.examDate,
            daysLeft,
            chapters: examData.chapters,
            color: examData.color || '#4f46e5',
          };
          setExams((prev) => [...prev, newExam]);
          setExamPrepExamId(newExam.id);
          if (generatedTasks && generatedTasks.length > 0) {
            handleScheduleRevisionTasks(generatedTasks);
          }
        }}
      />

      <StudentMasteryGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        onNavigateToTab={(tab) => setActiveTab(tab)}
      />

      {/* Global Toast Feedback for deletions & updates */}
      <ToastNotification
        message={toastMessage}
        onClose={() => setToastMessage(null)}
      />
    </div>
  );
}

