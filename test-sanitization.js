// Test filename sanitization
function sanitizeFilename(text) {
  if (!text) return '';
  
  // Remove invalid filename characters
  // Windows: < > : " | ? * \ / and control characters (0x00-0x1f)
  // Also remove leading/trailing dots and spaces
  let sanitized = text
    .replace(/[<>:"|?*\\/\x00-\x1f]/g, '')  // Remove invalid chars
    .replace(/^[.\s]+|[.\s]+$/g, '')        // Remove leading/trailing dots and spaces
    .trim();
  
  // If empty or only invalid characters, return default
  if (!sanitized) {
    return 'untitled';
  }
  
  // Truncate if too long (most filesystems support 255 chars)
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200);
  }
  
  return sanitized;
}

const testCases = [
  // Invalid filename characters
  'file<name>',
  'file|name',
  'file"name"',
  'file:name',
  'file*name',
  'file?name',
  'file\\name',
  'file/name',
  'file\x00name',
  'file\x1fname',
  
  // Edge cases
  '',
  '   ',
  '....',
  '.hidden',
  'normal file',
  'français',
  'あいうえお',
  '中文',
  'русский',
  'العربية',
  'émojis🎉',
  
  // Path traversal attempts
  '../../../etc',
  '..\\..\\..\\windows',
  
  // Very long names
  'a'.repeat(300),
  
  // Mixed valid/invalid
  'normal<>chars',
  'good|bad*ugly',
  'file with spaces',
  'file.with.dots',
];

console.log("Testing filename sanitization:\n");

testCases.forEach((input, i) => {
  const output = sanitizeFilename(input);
  const inputDisplay = JSON.stringify(input.replace(/\x00/g, '\\x00').replace(/\x1f/g, '\\x1f'));
  const outputDisplay = JSON.stringify(output);
  
  console.log(`Test ${i + 1}:`);
  console.log(`  Input:  ${inputDisplay}`);
  console.log(`  Output: ${outputDisplay}`);
  console.log(`  Safe:   ${output.length > 0 && output !== 'untitled' ? '✓' : '⚠'}`);
  console.log("");
});

// Test task filename generation
console.log("=== Task Filename Generation ===\n");

const taskTests = [
  '@work file<name>',
  '@bug normal task',
  '@urgent ファイル名',
  '@test ',
  '@empty',
  '@special ../../../etc',
];

taskTests.forEach((input, i) => {
  const mentionRE = /(?<!\S)@([^\s@/]+)/gu;
  const mentions = [...input.matchAll(mentionRE)].map((m) => m[1]);
  const rawBody = input.replace(mentionRE, "").trim() || mentions.join(" ");
  const body = sanitizeFilename(rawBody);
  
  if (mentions.length > 0) {
    const taskFileName = `tasks/${mentions[0]}-${body}.md`;
    console.log(`Task ${i + 1}: ${JSON.stringify(input)}`);
    console.log(`  Mention: ${mentions[0]}`);
    console.log(`  Raw body: ${JSON.stringify(rawBody)}`);
    console.log(`  Sanitized body: ${JSON.stringify(body)}`);
    console.log(`  Filename: ${taskFileName}`);
    console.log("");
  }
});