import React from 'react';
import {
  RoadmapMilestoneCard,
  ConceptItem,
} from './RoadmapMilestoneCard';
import { Section } from '../../types';

export interface MilestoneCardProps {
  section: Section;
  chapterName: string;
  chapterRawText?: string;
  index: number;
  totalSections: number;
  isExpanded: boolean;
  isGeneratingDetail?: boolean;
  onToggleExpand: () => void;
  // Card Actions
  onOpenFlashcards: (section: Section, mode: 'practice' | 'edit') => void;
  onOpenQuiz: (section: Section, mode: 'study' | 'test') => void;
  onSaveMilestoneQuestions?: (sectionId: string, questions: any[]) => void;
  onSaveMilestoneCards?: (sectionId: string, cards: any[]) => void;
  // Sub-action Links
  onRead: (section: Section) => void;
  onReadSummary: (section: Section) => void;
  onReadDocument: (section: Section) => void;
  // Sequential Modules
  onOpenCheckpoints?: (section: Section) => void;
  onLaunchRecallDeck?: (section: Section) => void;
  // Concept toggles
  onToggleConceptSkip?: (sectionId: string, conceptId: string, isSkipped: boolean) => void;
  onToggleConceptStatus?: (
    sectionId: string,
    conceptId: string,
    newStatus: 'not_started' | 'learning' | 'mastered'
  ) => void;
}

/**
 * MilestoneCard Component (Roadmap Milestone View)
 * Connects the "Check Learning" / "Resume Check" action directly to the active runner state.
 */
export const MilestoneCard: React.FC<MilestoneCardProps> = (props) => {
  return <RoadmapMilestoneCard {...props} />;
};

export { RoadmapMilestoneCard };
export type { ConceptItem };
export default MilestoneCard;
