// Verification script to count questions by category and difficulty
const fs = require('fs');

const content = fs.readFileSync('./src/data/questions.ts', 'utf8');

// Count questions
const categories = {
  'World Geography': { easy: 0, medium: 0, hard: 0 },
  'Science and Technology': { easy: 0, medium: 0, hard: 0 },
  'Arts and Culture': { easy: 0, medium: 0, hard: 0 },
  'World History': { easy: 0, medium: 0, hard: 0 },
  'Sports and Entertainment': { easy: 0, medium: 0, hard: 0 }
};

// Extract category and difficulty pairs
const questionBlocks = content.split('{').slice(1); // Skip the first split (before first {)

questionBlocks.forEach(block => {
  const categoryMatch = block.match(/category:\s*'([^']+)'/);
  const difficultyMatch = block.match(/difficulty:\s*'([^']+)'/);

  if (categoryMatch && difficultyMatch) {
    const category = categoryMatch[1];
    const difficulty = difficultyMatch[1];

    if (categories[category]) {
      categories[category][difficulty]++;
    }
  }
});

console.log('Question Distribution by Category and Difficulty:\n');
console.log('='.repeat(60));

let allCategoriesMeetRequirement = true;

Object.keys(categories).sort().forEach(category => {
  const stats = categories[category];
  console.log(`\n${category}:`);
  console.log(`  Easy:   ${stats.easy.toString().padStart(2)} ${stats.easy >= 10 ? '✓' : '✗ (need ' + (10 - stats.easy) + ' more)'}`);
  console.log(`  Medium: ${stats.medium.toString().padStart(2)} ${stats.medium >= 10 ? '✓' : '✗ (need ' + (10 - stats.medium) + ' more)'}`);
  console.log(`  Hard:   ${stats.hard.toString().padStart(2)} ${stats.hard >= 10 ? '✓' : '✗ (need ' + (10 - stats.hard) + ' more)'}`);
  console.log(`  Total:  ${stats.easy + stats.medium + stats.hard}`);

  if (stats.easy < 10 || stats.medium < 10 || stats.hard < 10) {
    allCategoriesMeetRequirement = false;
  }
});

console.log('\n' + '='.repeat(60));

const totalEasy = Object.values(categories).reduce((sum, cat) => sum + cat.easy, 0);
const totalMedium = Object.values(categories).reduce((sum, cat) => sum + cat.medium, 0);
const totalHard = Object.values(categories).reduce((sum, cat) => sum + cat.hard, 0);

console.log(`\nTotal Questions: ${totalEasy + totalMedium + totalHard}`);
console.log(`  Easy: ${totalEasy}`);
console.log(`  Medium: ${totalMedium}`);
console.log(`  Hard: ${totalHard}`);

console.log('\n' + '='.repeat(60));

if (allCategoriesMeetRequirement) {
  console.log('\n✅ SUCCESS: All categories have at least 10 questions per difficulty level!\n');
} else {
  console.log('\n❌ INCOMPLETE: Some categories need more questions.\n');
}
