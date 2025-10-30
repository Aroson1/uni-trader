/**
 * Test script for avatar generator
 * Run with: node scripts/test-avatar-generator.js
 */

// Since this is a test script, we'll include the function inline
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function getAvatarNumber(username) {
  if (!username) return 1;
  const hash = hashString(username.toLowerCase());
  return (hash % 28) + 1;
}

// Test cases
const testUsers = [
  'Alice',
  'Bob',
  'Charlie',
  'David',
  'Emma',
  'Frank',
  'Grace',
  'Henry',
  'Isabella',
  'Jack',
  'Kate',
  'Liam',
  'Mia',
  'Noah',
  'Olivia',
  'Peter',
  'Quinn',
  'Ryan',
  'Sophia',
  'Thomas',
];

console.log('Avatar Generator Test Results:');
console.log('================================\n');

testUsers.forEach(username => {
  const avatarNum = getAvatarNumber(username);
  console.log(`${username.padEnd(15)} → Avatar ${avatarNum.toString().padStart(2)} → /assets/avatars/avatar-${avatarNum}.png`);
});

console.log('\n================================');
console.log('Consistency Test:');
console.log('================================\n');

// Test consistency - same name should always give same result
const testName = 'TestUser';
const results = [];
for (let i = 0; i < 5; i++) {
  results.push(getAvatarNumber(testName));
}

const allSame = results.every(r => r === results[0]);
console.log(`Testing "${testName}" 5 times...`);
console.log(`Results: ${results.join(', ')}`);
console.log(`Consistent: ${allSame ? '✓ YES' : '✗ NO'}`);

console.log('\n================================');
console.log('Distribution Test (100 random names):');
console.log('================================\n');

const distribution = new Array(28).fill(0);
for (let i = 0; i < 100; i++) {
  const randomName = `User${i}`;
  const avatarNum = getAvatarNumber(randomName);
  distribution[avatarNum - 1]++;
}

console.log('Avatar assignments:');
for (let i = 0; i < 28; i++) {
  const bar = '█'.repeat(Math.round(distribution[i] / 2));
  console.log(`Avatar ${(i + 1).toString().padStart(2)}: ${bar} (${distribution[i]})`);
}
