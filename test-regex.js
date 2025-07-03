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
  },
  {
    input: "@hogehoge something",
    expectedMentions: ["hogehoge"],
    expectedBody: "something"
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

// Test link replacement
console.log("\n\nTesting mention to link conversion:");
testCases.forEach(test => {
  let linkedText = test.input;
  
  const mentions = [...test.input.matchAll(mentionRE)].map((m) => m[1]);
  
  // First, replace @mentions with @[[mention]] links
  linkedText = linkedText.replace(mentionRE, (match, mention) => {
    return `@[[${mention}]]`;
  });
  
  // Then, convert remaining words to [[mention/word]] links using first mention
  let processedText = linkedText;
  const wordRE = /\b\w+\b/g;
  let match;
  let offset = 0;
  
  while ((match = wordRE.exec(linkedText)) !== null) {
    const word = match[0];
    const startPos = match.index + offset;
    
    // Check if this word is inside a [[...]] link
    const beforeText = processedText.substring(0, startPos);
    const openBrackets = (beforeText.match(/\[\[/g) || []).length;
    const closeBrackets = (beforeText.match(/\]\]/g) || []).length;
    const inLink = openBrackets > closeBrackets;
    
    if (inLink) {
      continue;
    }
    
    // Skip email addresses - check if this word is part of an email
    const emailContext = linkedText.substring(Math.max(0, match.index - 20), match.index + word.length + 20);
    if (emailContext.match(/\w+@\w+\.\w+/)) {
      continue;
    }
    
    // Don't link common words
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'];
    if (commonWords.includes(word.toLowerCase())) {
      continue;
    }
    
    // Use the first mention for the word links
    let replacement;
    if (mentions.length > 0) {
      replacement = `[[${mentions[0]}/${word}]]`;
    } else {
      replacement = `[[tasks/${word}]]`; // fallback if no mentions
    }
    
    // Replace the word with the link
    processedText = processedText.substring(0, startPos) + replacement + processedText.substring(startPos + word.length);
    offset += replacement.length - word.length;
  }
  
  linkedText = processedText;
  
  console.log(`"${test.input}"`);
  console.log(`  → "${linkedText}"`);
  console.log();
});