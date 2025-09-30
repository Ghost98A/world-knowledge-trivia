import { useState } from 'react';
import { useSubscribeDev } from '@subscribe.dev/react';
import { ThemeToggle } from './ThemeToggle';
import type { TriviaQuestion, GameState } from '../types';
import { triviaQuestions } from '../data/questions';

const QUESTIONS_PER_DIFFICULTY = 15;
const QUESTIONS_PER_GAME = QUESTIONS_PER_DIFFICULTY * 3; // 45 total questions (15 easy, 15 medium, 15 hard)

// Extract unique categories from questions
const getCategories = (): string[] => {
  const categories = new Set(triviaQuestions.map((q) => q.category));
  return ['All Categories', ...Array.from(categories).sort()];
};

export function TriviaGame() {
  const { usage, subscriptionStatus, subscribe, signOut, useStorage, user, client } =
    useSubscribeDev();

  const [gameState, setGameState, syncStatus] = useStorage!<GameState>('trivia-game-state', {
    currentQuestionIndex: 0,
    score: 0,
    questions: [],
    answered: false,
    selectedAnswer: null,
    gameStarted: false,
    selectedDifficulty: null,
    selectedCategory: null,
    totalGamesPlayed: 0,
    highScore: 0,
  });

  const [loading, setLoading] = useState(false);

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const handleDifficultySelect = (difficulty: 'easy' | 'medium' | 'hard') => {
    setGameState({
      ...gameState,
      selectedDifficulty: difficulty,
    });
  };

  const handleCategorySelect = (category: string) => {
    setGameState({
      ...gameState,
      selectedCategory: category,
    });
  };

  const startGame = async () => {
    if (!gameState.selectedDifficulty || !client) return;

    setLoading(true);

    try {
      // Filter questions by selected difficulty
      let filteredQuestions = triviaQuestions.filter(
        (q) => q.difficulty === gameState.selectedDifficulty
      );

      // Further filter by category if a specific category is selected
      if (gameState.selectedCategory && gameState.selectedCategory !== 'All Categories') {
        filteredQuestions = filteredQuestions.filter(
          (q) => q.category === gameState.selectedCategory
        );
      }

      // Shuffle the filtered questions to provide variety
      const shuffledQuestions = shuffleArray(filteredQuestions);

      // Generate images for questions (as hints based on the correct answer)
      const questionsWithImages = await Promise.all(
        shuffledQuestions.map(async (question) => {
          try {
            const correctAnswerText = question.options[question.correctAnswer];
            const imagePrompt = `A visual hint for: ${correctAnswerText}. Clear, recognizable, educational illustration style.`;

            const { output } = await client.run('black-forest-labs/flux-schnell', {
              input: {
                prompt: imagePrompt,
                width: 512,
                height: 512,
              },
            });

            return {
              ...question,
              imageUrl: output[0] as string,
            };
          } catch (error) {
            console.error('Failed to generate image for question:', error);
            // Return question without image if generation fails
            return question;
          }
        })
      );

      setGameState({
        ...gameState,
        questions: questionsWithImages,
        currentQuestionIndex: 0,
        score: 0,
        answered: false,
        selectedAnswer: null,
        gameStarted: true,
        lastPlayedAt: Date.now(),
      });
    } catch (error) {
      console.error('Failed to start game:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (gameState.answered) return;

    const currentQuestion = gameState.questions[gameState.currentQuestionIndex];
    const isCorrect = answerIndex === currentQuestion.correctAnswer;

    setGameState({
      ...gameState,
      selectedAnswer: answerIndex,
      answered: true,
      score: isCorrect ? gameState.score + 1 : gameState.score,
    });
  };

  const handleNextQuestion = () => {
    const nextIndex = gameState.currentQuestionIndex + 1;

    if (nextIndex < gameState.questions.length) {
      setGameState({
        ...gameState,
        currentQuestionIndex: nextIndex,
        answered: false,
        selectedAnswer: null,
      });
    } else {
      const newHighScore =
        gameState.score > gameState.highScore ? gameState.score : gameState.highScore;
      setGameState({
        ...gameState,
        gameStarted: false,
        totalGamesPlayed: gameState.totalGamesPlayed + 1,
        highScore: newHighScore,
      });
    }
  };

  const restartGame = () => {
    setGameState({
      ...gameState,
      currentQuestionIndex: 0,
      score: 0,
      answered: false,
      selectedAnswer: null,
      gameStarted: false,
      selectedDifficulty: null,
      selectedCategory: null,
      questions: [],
    });
  };

  const quitGame = () => {
    setGameState({
      ...gameState,
      currentQuestionIndex: 0,
      score: 0,
      answered: false,
      selectedAnswer: null,
      gameStarted: false,
      selectedDifficulty: null,
      selectedCategory: null,
      questions: [],
    });
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <ThemeToggle />
        <div className="spinner"></div>
        <p>Generating your trivia questions with AI image hints...</p>
        <p className="loading-subtext">This may take a moment</p>
      </div>
    );
  }

  // Game over screen
  if (gameState.gameStarted && gameState.currentQuestionIndex >= gameState.questions.length) {
    const totalQuestions = gameState.questions.length;
    const percentage = Math.round((gameState.score / totalQuestions) * 100);
    return (
      <div className="game-over-screen">
        <ThemeToggle />
        <h2>🎉 Game Complete!</h2>
        <div className="score-display">
          <div className="final-score">
            {gameState.score} / {totalQuestions}
          </div>
          <div className="percentage">{percentage}% Correct</div>
        </div>

        <div className="stats">
          <div className="stat">
            <span className="stat-label">High Score</span>
            <span className="stat-value">{gameState.highScore}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Games Played</span>
            <span className="stat-value">{gameState.totalGamesPlayed}</span>
          </div>
        </div>

        <button className="primary-button" onClick={restartGame}>
          Play Again
        </button>
      </div>
    );
  }

  // Game screen
  if (gameState.gameStarted && gameState.questions.length > 0) {
    const currentQuestion = gameState.questions[gameState.currentQuestionIndex];
    const totalQuestions = gameState.questions.length;
    const progress = ((gameState.currentQuestionIndex + 1) / totalQuestions) * 100;

    return (
      <div className="game-screen">
        <ThemeToggle />
        <div className="game-header">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="game-info">
            <span className="question-counter">
              Question {gameState.currentQuestionIndex + 1} of {totalQuestions}
            </span>
            <span className="score">Score: {gameState.score}</span>
          </div>
          <button className="quit-button" onClick={quitGame}>
            ✕ Quit Game
          </button>
        </div>

        <div className="question-card">
          <div className="badges-container">
            <div className="category-badge">{currentQuestion.category}</div>
            <div className={`difficulty-badge ${currentQuestion.difficulty}`}>
              {currentQuestion.difficulty.charAt(0).toUpperCase() + currentQuestion.difficulty.slice(1)}
            </div>
          </div>
          <h2 className="question-text">{currentQuestion.question}</h2>

          {currentQuestion.imageUrl && (
            <div className="question-image-container">
              <img
                src={currentQuestion.imageUrl}
                alt="Visual hint"
                className="question-image"
              />
              <p className="image-hint-label">💡 Visual Hint</p>
            </div>
          )}

          <div className="options-grid">
            {currentQuestion.options.map((option, index) => {
              const isSelected = gameState.selectedAnswer === index;
              const isCorrect = index === currentQuestion.correctAnswer;
              const showResult = gameState.answered;

              let className = 'option-button';
              if (showResult) {
                if (isCorrect) {
                  className += ' correct';
                } else if (isSelected && !isCorrect) {
                  className += ' incorrect';
                }
              } else if (isSelected) {
                className += ' selected';
              }

              return (
                <button
                  key={index}
                  className={className}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={gameState.answered}
                >
                  <span className="option-letter">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="option-text">{option}</span>
                </button>
              );
            })}
          </div>

          {gameState.answered && (
            <button className="next-button" onClick={handleNextQuestion}>
              {gameState.currentQuestionIndex < gameState.questions.length - 1
                ? 'Next Question →'
                : 'Finish Game'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Start screen
  return (
    <div className="start-screen">
      <ThemeToggle />
      <div className="header">
        <div className="user-info">
          <span className="user-email">{user?.email}</span>
          <button className="sign-out-button" onClick={signOut}>
            Sign Out
          </button>
        </div>
      </div>

      <div className="welcome-section">
        <h1>🌍 World Knowledge Trivia</h1>
        <p className="description">
          Test your knowledge of the world with our curated trivia questions!
        </p>

        <div className="category-selector">
          <label>Choose a Category:</label>
          <div className="category-buttons">
            {getCategories().map((category) => (
              <button
                key={category}
                className={`category-button ${gameState.selectedCategory === category ? 'active' : ''}`}
                onClick={() => handleCategorySelect(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="difficulty-selector">
          <label>Choose Your Difficulty:</label>
          <div className="difficulty-buttons">
            <button
              className={`difficulty-button ${gameState.selectedDifficulty === 'easy' ? 'active' : ''}`}
              onClick={() => handleDifficultySelect('easy')}
            >
              🟢 Easy
            </button>
            <button
              className={`difficulty-button ${gameState.selectedDifficulty === 'medium' ? 'active' : ''}`}
              onClick={() => handleDifficultySelect('medium')}
            >
              🟡 Medium
            </button>
            <button
              className={`difficulty-button ${gameState.selectedDifficulty === 'hard' ? 'active' : ''}`}
              onClick={() => handleDifficultySelect('hard')}
            >
              🔴 Hard
            </button>
          </div>
        </div>

        <button
          className="start-button"
          onClick={startGame}
          disabled={loading || !gameState.selectedDifficulty}
        >
          Start New Game
        </button>

        {gameState.totalGamesPlayed > 0 && (
          <div className="stats-summary">
            <div className="stat-item">
              <span className="stat-label">High Score</span>
              <span className="stat-value">{gameState.highScore}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Games Played</span>
              <span className="stat-value">{gameState.totalGamesPlayed}</span>
            </div>
            {gameState.lastPlayedAt && (
              <div className="stat-item">
                <span className="stat-label">Last Played</span>
                <span className="stat-value">
                  {new Date(gameState.lastPlayedAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="footer">
        <div className="usage-info">
          <span className="credits">
            Credits: {usage?.remainingCredits ?? 0} remaining
          </span>
          <span className="plan">
            Plan: {subscriptionStatus?.plan?.name ?? 'Free'}
          </span>
          {syncStatus !== 'synced' && (
            <span className="sync-status">Sync: {syncStatus}</span>
          )}
        </div>
        <button className="manage-subscription-button" onClick={subscribe!}>
          Manage Subscription
        </button>
      </div>
    </div>
  );
}
