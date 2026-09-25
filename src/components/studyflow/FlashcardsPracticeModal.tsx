import React from 'react';
import { Section, DocumentFlashcard } from '../../types';
import { FullScreenFlashcardStudy } from './FullScreenFlashcardStudy';

interface FlashcardsPracticeModalProps {
  section: Section;
  chapterName: string;
  subjectName?: string;
  isOpen: boolean;
  mode?: 'practice' | 'edit';
  onClose: () => void;
  onUpdateCards?: (sectionId: string, updatedCards: DocumentFlashcard[]) => void;
}

export const FlashcardsPracticeModal: React.FC<FlashcardsPracticeModalProps> = ({
  section,
  chapterName,
  subjectName,
  isOpen,
  mode = 'practice',
  onClose,
  onUpdateCards,
}) => {
  return (
    <FullScreenFlashcardStudy
      section={section}
      activeMilestone={section}
      chapterName={chapterName}
      activeChapter={{ name: chapterName, title: chapterName }}
      subjectName={subjectName}
      isOpen={isOpen}
      initialMode={mode}
      onClose={onClose}
      onUpdateCards={onUpdateCards}
    />
  );
};

export { FullScreenFlashcardStudy };
