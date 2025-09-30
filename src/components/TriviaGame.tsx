import { useState } from 'react';
import { useSubscribeDev } from '@subscribe.dev/react';
import { z } from 'zod';
import { ThemeToggle } from './ThemeToggle';
import type { TriviaQuestion, GameState } from '../types';

const triviaQuestionSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()).length(4),
      correctAnswer: z.number().min(0).max(3),
      category: z.string(),
      difficulty: z.enum(['easy', 'medium', 'hard']),
    })
  ),
});

const QUESTIONS_PER_DIFFICULTY = 15;
const QUESTIONS_PER_GAME = QUESTIONS_PER_DIFFICULTY * 3; // 45 total questions (15 easy, 15 medium, 15 hard)

export function TriviaGame() {
  const { client, usage, subscriptionStatus, subscribe, signOut, useStorage, user } =
    useSubscribeDev();

  const [gameState, setGameState, syncStatus] = useStorage!<GameState>('trivia-game-state', {
    currentQuestionIndex: 0,
    score: 0,
    questions: [],
    answered: false,
    selectedAnswer: null,
    gameStarted: false,
    totalGamesPlayed: 0,
    highScore: 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    'World Geography',
    'World History',
    'Science and Technology',
    'Arts and Culture',
    'Sports and Entertainment',
  ];

  const generateQuestions = async () => {
    if (!client) return;
    setLoading(true);
    setError(null);

    try {
      // Generate 15 questions for each difficulty level
      const difficulties: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];
      const allQuestions: TriviaQuestion[] = [];

      for (const difficulty of difficulties) {
        const { output } = await client.run('openai/gpt-4o', {
          input: {
            messages: [
              {
                role: 'system',
                content:
                  'You are a trivia game question generator. Generate diverse, interesting, and accurate trivia questions about world knowledge. Ensure each question is unique and matches the specified difficulty level.',
              },
              {
                role: 'user',
                content: `Generate exactly ${QUESTIONS_PER_DIFFICULTY} unique trivia questions about world knowledge. Include questions from various categories: ${categories.join(', ')}.

Difficulty level: ${difficulty}

For ${difficulty} difficulty:
${difficulty === 'easy' ? '- Use well-known facts and common knowledge\n- Questions should be straightforward with obvious answers\n- Include popular topics and widely recognized information' : ''}
${difficulty === 'medium' ? '- Use moderately challenging facts\n- Require some specific knowledge but not highly specialized\n- Mix common and less common topics' : ''}
${difficulty === 'hard' ? '- Use obscure or highly specific facts\n- Require detailed knowledge of the subject\n- Include lesser-known information and complex concepts' : ''}

Each question must:
1. Have exactly 4 unique options
2. Have exactly one correct answer
3. Be different from any previous questions
4. Match the ${difficulty} difficulty level appropriately`,
              },
            ],
          },
          response_format: triviaQuestionSchema,
        });

        const parsedOutput = output[0] as { questions: TriviaQuestion[] };
        allQuestions.push(...parsedOutput.questions);
      }

      setGameState({
        ...gameState,
        questions: allQuestions,
        currentQuestionIndex: 0,
        score: 0,
        answered: false,
        selectedAnswer: null,
        gameStarted: true,
        lastPlayedAt: Date.now(),
      });
    } catch (err: any) {
      if (err.type === 'insufficient_credits') {
        setError('Insufficient credits. Please upgrade your plan to continue playing.');
      } else if (err.type === 'rate_limit_exceeded') {
        const retryAfterSeconds = Math.ceil((err.retryAfter || 0) / 1000);
        setError(`Rate limit exceeded. Please try again in ${retryAfterSeconds} seconds.`);
      } else {
        setError('Failed to generate questions. Please try again.');
        console.error('Generation failed:', err);
      }
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
      questions: [],
    });
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <ThemeToggle />
        <div className="spinner"></div>
        <p>Generating trivia questions...</p>
      </div>
    );
  }

  // Game over screen
  if (gameState.gameStarted && gameState.currentQuestionIndex >= gameState.questions.length) {
    const percentage = Math.round((gameState.score / QUESTIONS_PER_GAME) * 100);
    return (
      <div className="game-over-screen">
        <ThemeToggle />
        <h2>🎉 Game Complete!</h2>
        <div className="score-display">
          <div className="final-score">
            {gameState.score} / {QUESTIONS_PER_GAME}
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
    const progress = ((gameState.currentQuestionIndex + 1) / QUESTIONS_PER_GAME) * 100;

    return (
      <div className="game-screen">
        <ThemeToggle />
        <div className="game-header">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="game-info">
            <span className="question-counter">
              Question {gameState.currentQuestionIndex + 1} of {QUESTIONS_PER_GAME}
            </span>
            <span className="score">Score: {gameState.score}</span>
          </div>
        </div>

        <div className="question-card">
          <div className="badges-container">
            <div className="category-badge">{currentQuestion.category}</div>
            <div className={`difficulty-badge ${currentQuestion.difficulty}`}>
              {currentQuestion.difficulty.charAt(0).toUpperCase() + currentQuestion.difficulty.slice(1)}
            </div>
          </div>
          <h2 className="question-text">{currentQuestion.question}</h2>

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
          Test your knowledge of the world with AI-generated trivia questions!
        </p>
        <p className="game-info-text">
          Each game includes 45 questions: 15 easy, 15 medium, and 15 hard questions.
        </p>

        {error && (
          <div className="error-message">
            {error}
            {error.includes('credits') && (
              <button className="upgrade-button" onClick={subscribe!}>
                Upgrade Plan
              </button>
            )}
          </div>
        )}

        <button className="start-button" onClick={generateQuestions} disabled={loading}>
          Start New Game
        </button>

        {gameState.totalGamesPlayed > 0 && (
          <div className="stats-summary">
            <div className="stat-item">
              <span className="stat-label">High Score</span>
              <span className="stat-value">{gameState.highScore}/{QUESTIONS_PER_GAME}</span>
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
