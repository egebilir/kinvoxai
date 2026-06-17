import Anthropic from "@anthropic-ai/sdk";

const STYLE_GUIDES: Record<string, string> = {
  horror:
    "Dark, suspenseful, and terrifying. Build dread gradually. Use visceral imagery and psychological tension. The narrator sounds haunted.",
  adventure:
    "Epic, thrilling, and action-packed. Fast pacing with dramatic moments. The narrator sounds excited and breathless.",
  comedy:
    "Witty, absurd, and laugh-out-loud funny. Use irony, unexpected twists, and comedic timing. The narrator has dry humor.",
  drama:
    "Emotional, gripping, and deeply human. Focus on relationships and internal conflict. The narrator is reflective and sincere.",
  scifi:
    "Futuristic, thought-provoking, and imaginative. Explore technology and its impact on humanity. The narrator sounds analytical yet awed.",
};

const DURATION_CONFIG = {
  short: {
    wordRange: "300-400",
    sceneCount: "6-8",
    label: "TikTok (1-1.5 minutes)",
    wordsPerScene: "30-50",
  },
  long: {
    wordRange: "800-1200",
    sceneCount: "15-20",
    label: "YouTube (5-7 minutes)",
    wordsPerScene: "40-60",
  },
};

function buildSystemPrompt(
  style: string,
  duration: "short" | "long"
): string {
  const config = DURATION_CONFIG[duration];
  const styleGuide = STYLE_GUIDES[style] || STYLE_GUIDES.drama;

  return `You are a creative storyteller who writes engaging narratives for video content.
The user will submit a story premise. Generate a compelling story written in clear, conversational tone suitable for voiceover narration.

RULES:
- Write exactly ${config.sceneCount} scenes separated by "---" on its own line
- Total story length: ${config.wordRange} words
- Each scene should be ${config.wordsPerScene} words and visually descriptive (for AI image generation later)
- Write in second person ("You wake up...", "You hear...") for immersion
- No dialogue tags, keep it narrative voiceover style
- Each scene must paint a clear visual picture
- Build tension/emotion progressively across scenes
- End with a memorable final scene

STYLE: ${styleGuide}
DURATION: ${config.label}

RESPONSE FORMAT:
Return ONLY valid JSON with this exact structure (no markdown, no code fences):
{
  "title": "Story title here",
  "story": "Full story text with scenes separated by ---",
  "scenes": ["Scene 1 text", "Scene 2 text", ...]
}`;
}

export interface StoryResult {
  title: string;
  story: string;
  scenes: string[];
}

export async function generateStory(
  prompt: string,
  style: string,
  duration: "short" | "long"
): Promise<StoryResult> {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    throw new Error("CLAUDE_API_KEY is not set in environment variables");
  }

  const client = new Anthropic({ apiKey });
  const systemPrompt = buildSystemPrompt(style, duration);

  const message = await client.messages.create({
    model: process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Write a ${style} story about: ${prompt}`,
      },
    ],
  });

  // Extract text content from response
  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content in Claude response");
  }

  const rawText = textBlock.text.trim();

  // Parse JSON response - handle potential markdown code fences
  let jsonStr = rawText;
  const fenceMatch = rawText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  const parsed = JSON.parse(jsonStr) as StoryResult;

  // Validate structure
  if (!parsed.title || !parsed.story || !Array.isArray(parsed.scenes)) {
    throw new Error("Invalid story structure from Claude");
  }

  return parsed;
}
