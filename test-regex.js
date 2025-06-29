// Test script for the mention regex patterns

const testCases = [
  {
    input: "Fix the login bug @work @urgent",
    expectedMentions: ["work", "urgent"],
    expectedBody: "Fix the login bug"
  },
  {
    input: "Buy groceries @shopping",
    expectedMentions: ["shopping"],
    expectedBody: "Buy groceries"
  },
  {
    input: "Task without mentions",
    expectedMentions: [],
    expectedBody: "Task without mentions"
  },
  {
    input: "@personal Call mom @family",
    expectedMentions: ["personal", "family"],
    expectedBody: "Call mom"
  },
  {
    input: "@work @urgent @today",
    expectedMentions: ["work", "urgent", "today"],
    expectedBody: "work urgent today" // When only mentions, join them
  },
  {
    input: "Email john@example.com about @meeting",
    expectedMentions: ["meeting"],
    expectedBody: "Email john@example.com about"
  }
];

// Regex from main.ts (with negative lookbehind to avoid matching emails)
const mentionRE = /(?<!\S)@([^\s@/]+)/gu;

console.log("Testing mention extraction regex:\n");

testCases.forEach((test, index) => {
  console.log(`Test ${index + 1}: "${test.input}"`);
  
  // Extract mentions
  const mentions = [...test.input.matchAll(mentionRE)].map((m) => m[1]);
  
  // Remove mentions to get body
  const body = test.input.replace(mentionRE, "").trim() || mentions.join(" ");
  
  // Check results
  const mentionsMatch = JSON.stringify(mentions) === JSON.stringify(test.expectedMentions);
  const bodyMatch = body === test.expectedBody;
  
  console.log(`  Mentions: ${JSON.stringify(mentions)} ${mentionsMatch ? '✓' : '✗ Expected: ' + JSON.stringify(test.expectedMentions)}`);
  console.log(`  Body: "${body}" ${bodyMatch ? '✓' : '✗ Expected: "' + test.expectedBody + '"'}`);
  console.log(`  Task line: "- [ ] ${body}"`);
  console.log();
});

// Test the file paths that would be created
console.log("\nFile paths that would be created:");
testCases.forEach(test => {
  const mentions = [...test.input.matchAll(mentionRE)].map((m) => m[1]);
  if (mentions.length > 0) {
    console.log(`"${test.input}" → ${mentions.map(m => `${m}.md`).join(", ")}`);
  }
});