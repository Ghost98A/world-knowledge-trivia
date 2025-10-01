// Quick script to analyze question distribution
const fs = require('fs');

const content = fs.readFileSync('./src/data/questions.ts', 'utf8');

// Extract questions info using regex
const questionPattern = /{\s*question:.*?category:\s*'([^']+)',\s*difficulty:\s*'([^']+)',\s*}/gs;

const matches = [...content.matchAll(questionPattern)];

const distribution = {};

matches.forEach(match => {
  const category = match[1];
  const difficulty = match[2];

  if (!distribution[category]) {
    distribution[category] = { easy: 0, medium: 0, hard: 0 };
  }
  distribution[category][difficulty]++;
});

console.log('Current Question Distribution:\n');
Object.keys(distribution).sort().forEach(category => {
  console.log(`${category}:`);
  console.log(`  Easy: ${distribution[category].easy}`);
  console.log(`  Medium: ${distribution[category].medium}`);
  console.log(`  Hard: ${distribution[category].hard}`);
  console.log(`  Total: ${distribution[category].easy + distribution[category].medium + distribution[category].hard}`);
  console.log();
});

console.log('\nCategories needing more questions (< 10 per difficulty):');
Object.keys(distribution).sort().forEach(category => {
  const needs = [];
  if (distribution[category].easy < 10) needs.push(`Easy: need ${10 - distribution[category].easy}`);
  if (distribution[category].medium < 10) needs.push(`Medium: need ${10 - distribution[category].medium}`);
  if (distribution[category].hard < 10) needs.push(`Hard: need ${10 - distribution[category].hard}`);

  if (needs.length > 0) {
    console.log(`\n${category}:`);
    needs.forEach(n => console.log(`  ${n}`));
  }
});
