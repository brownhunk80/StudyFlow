import React from 'react';
import { RecallScreen } from './RecallScreen';
import { Flashcard, FlashcardDeck, SubjectItem } from '../types';

export interface RecallViewProps {
  decks?: FlashcardDeck[];
  cards?: Flashcard[];
  flashcards?: Flashcard[];
  subjects?: SubjectItem[];
  onStartRecallSession?: (deckId?: string, subject?: string) => void;
  onStartSession?: (deckId?: string) => void;
  onOpenAddCard?: (defaultDeckId?: string) => void;
  onAddCard?: (defaultDeckId?: string) => void;
  onOpenAddDeck?: () => void;
  onAddDeck?: () => void;
  onDeleteDeck?: (deckId: string) => void;
  onDeleteCard?: (cardId: string) => void;
  onGenerateAIFlashcards?: (topic: string, targetDeckId: string) => void;
  onAddFlashcards?: (cards: Array<Omit<Flashcard, 'id' | 'interval' | 'repetitions' | 'easeFactor' | 'status' | 'box'>>) => void;
}

/**
 * RecallView Component
 * Renders the primary Recall tab view with active recall queue, due card calculation,
 * and dynamic time estimates (~0.5 mins per due card).
 */
export const RecallView: React.FC<RecallViewProps> = (props) => {
  return <RecallScreen {...props} />;
};

export { RecallScreen };
export default RecallView;
