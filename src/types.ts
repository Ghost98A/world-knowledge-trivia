export interface TriviaQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface GameState {
  currentQuestionIndex: number;
  score: number;
  questions: TriviaQuestion[];
  answered: boolean;
  selectedAnswer: number | null;
  gameStarted: boolean;
  selectedDifficulty: 'easy' | 'medium' | 'hard' | null;
  lastPlayedAt?: number;
  totalGamesPlayed: number;
  highScore: number;
}

export interface GameHistory {
  date: number;
  score: number;
  totalQuestions: number;
  difficulty: string;
}
