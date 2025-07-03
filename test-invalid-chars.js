// Test invalid filename characters
const testCases = [
  // Invalid filename characters in various OS
  '@work file<name>',       // < >
  '@bug file|name',         // |
  '@test file"name"',       // "
  '@project file:name',     // :
  '@task file*name',        // *
  '@urgent file?name',      // ?
  '@fix file\\name',        // \
  '@update file/name',      // /
  '@new file\tname',        // tab
  '@old file\nname',        // newline
  '@special file\rname',    // carriage return
  '@control file\x00name',  // null character
  '@weird file\x1fname',    // control character
  '@path ../../../etc',     // path traversal
  '@dots ....',             // only dots
  '@empty   ',              // only spaces
  '@mixed normal<>chars',   // mixed valid/invalid
];

console.log("Testing invalid filename character handling:\n");

const wordRE = /(?<!\S)[^\s\r\n]+(?!\S)/g;
const mentionRE = /(?<!\S)@([^\s@/]+)/gu;

testCases.forEach((text, i) => {
  console.log(`Test ${i + 1}: "${text.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t').replace(/\x00/g, '\\x00').replace(/\x1f/g, '\\x1f')}"`);
  
  // Test mention extraction
  const mentions = [...text.matchAll(mentionRE)].map((m) => m[1]);
  console.log("  Mentions:", mentions);
  
  // Test body extraction
  const body = text.replace(mentionRE, "").trim();
  console.log("  Body:", JSON.stringify(body));
  
  // Test word extraction
  const words = [...body.matchAll(wordRE)].map(m => m[0]);
  console.log("  Words:", words.map(w => JSON.stringify(w)));
  
  // Check if words would be valid filenames
  const invalidChars = /[<>:"|?*\\/\x00-\x1f]/;
  const validWords = words.filter(word => !invalidChars.test(word));
  const invalidWords = words.filter(word => invalidChars.test(word));
  
  console.log("  Valid words:", validWords.map(w => JSON.stringify(w)));
  console.log("  Invalid words:", invalidWords.map(w => JSON.stringify(w)));
  
  // Test potential filename creation
  if (mentions.length > 0 && validWords.length > 0) {
    const taskFileName = `tasks/${mentions[0]}-${validWords[0]}.md`;
    console.log("  Would create file:", JSON.stringify(taskFileName));
  }
  
  console.log("");
});

// Test edge cases
console.log("=== Edge Cases ===\n");

const edgeCases = [
  '@test',                  // no content
  '@mention\n\nsecond line', // newline in content
  '@work     ',             // only spaces after mention
  '@bug \t\r\n',           // only whitespace
  '@special \x00\x01\x02', // control characters
];

edgeCases.forEach((text, i) => {
  console.log(`Edge ${i + 1}: "${text.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t').replace(/\x00/g, '\\x00').replace(/\x01/g, '\\x01').replace(/\x02/g, '\\x02')}"`);
  
  const mentions = [...text.matchAll(mentionRE)].map((m) => m[1]);
  const body = text.replace(mentionRE, "").trim();
  const words = [...body.matchAll(wordRE)].map(m => m[0]);
  
  console.log("  Mentions:", mentions);
  console.log("  Body:", JSON.stringify(body));
  console.log("  Words:", words.map(w => JSON.stringify(w)));
  console.log("");
});