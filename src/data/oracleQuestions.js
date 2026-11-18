/**
 * Curated Human Reflection Inquiries for The Oracle
 * Tone: Intimate, philosophical, poetic, open-ended.
 * Strictly non-corporate, avoiding generic productivity or self-help formulas.
 */
export const ORACLE_QUESTIONS = [
  { id: 'ora-1', category: 'Inner Thought', question: "What is a thought you’ve been carrying around lately that you haven't spoken out loud?" },
  { id: 'ora-2', category: 'Effort & Ease', question: "What felt effortless today, and what felt like a quiet struggle?" },
  { id: 'ora-3', category: 'Quiet Attention', question: "What is a small detail you noticed today that most people would have walked right past?" },
  { id: 'ora-4', category: 'Sensory Texture', question: "If today had a texture or a color, what would it be and why?" },
  { id: 'ora-5', category: 'Authenticity', question: "Where did you feel most like yourself today, even for just a few minutes?" },
  { id: 'ora-6', category: 'The Open Question', question: "What question are you living with right now that has no quick or easy answer?" },
  { id: 'ora-7', category: 'Lingering Truth', question: "What truth did you encounter in your recent reading or experience that lingered long after?" },
  { id: 'ora-8', category: 'Equilibrium', question: "What was outside your control today, and how did you choose to hold yourself through it?" },
  { id: 'ora-9', category: 'Quiet Impression', question: "Who left a quiet impression on your mind today, and why do you think you noticed?" },
  { id: 'ora-10', category: 'Sensory Keepsake', question: "If you could preserve just one sensory memory from today, what would it be?" },
  { id: 'ora-11', category: 'Thresholds', question: "What boundary between patience and hesitation are you navigating right now?" },
  { id: 'ora-12', category: 'Unseen Care', question: "What is one quiet standard of care or excellence you held yourself to today that nobody noticed?" },
  { id: 'ora-13', category: 'Letting Go', question: "What did you choose to let go of today so you wouldn't have to carry it into tomorrow?" },
  { id: 'ora-14', category: 'Subtext', question: "What conversation did you have today that felt like it was about more than what was said?" },
  { id: 'ora-15', category: 'Fluid Mind', question: "When did you last change your mind about something you thought you were certain of?" },
  { id: 'ora-16', category: 'Stillness', question: "Where did you find genuine stillness or equilibrium amidst the noise of the day?" },
  { id: 'ora-17', category: 'Shelter', question: "What part of your physical surroundings gave you a quiet feeling of shelter today?" },
  { id: 'ora-18', category: 'Curiosity', question: "What sparked your curiosity or enthusiasm today, even if only for a brief moment?" },
  { id: 'ora-19', category: 'Retirement', question: "What habit or thought pattern feels ready to be gently retired from your life?" },
  { id: 'ora-20', category: 'Intellectual Hunger', question: "If someone asked you what you are hungry for intellectually right now, what would you say?" },
  { id: 'ora-21', category: 'Inner Allowance', question: "What feeling did you try to push away today instead of simply letting it be?" },
  { id: 'ora-22', category: 'Priceless Light', question: "What is something beautiful you experienced recently that didn't cost anything?" },
  { id: 'ora-23', category: 'Quiet Promise', question: "What small promise to yourself did you keep today, however modest?" },
  { id: 'ora-24', category: 'True Rest', question: "What would feel like genuine rest for you tonight, beyond simply closing your eyes?" },
  { id: 'ora-25', category: 'Creative Hum', question: "What unfinished creative thought is still gently humming in the back of your mind?" },
  { id: 'ora-26', category: 'Dual Nature', question: "What is a contradiction in yourself that you are slowly learning to make peace with?" },
  { id: 'ora-27', category: 'Due Attention', question: "Who or what deserved more of your genuine attention today than you were able to give?" },
  { id: 'ora-28', category: 'Daily Title', question: "If today were a single chapter in a memoir of your year, what title would you give it?" },
  { id: 'ora-29', category: 'Physical Reality', question: "What did your body ask of you today that your schedule made hard to grant?" },
  { id: 'ora-30', category: 'Grace', question: "What was a moment today where you chose kindness over being right?" },
  { id: 'ora-31', category: 'Resonance', question: "What piece of music, art, or writing felt like it was speaking directly to you lately?" },
  { id: 'ora-32', category: 'Old Echoes', question: "What old fear appeared in a new disguise recently, and did you recognize it?" },
  { id: 'ora-33', category: 'Simple Joy', question: "What is one thing you did today purely for the quiet pleasure of doing it?" },
  { id: 'ora-34', category: 'External Weight', question: "What standard of other people are you most tired of measuring yourself against?" },
  { id: 'ora-35', category: 'Retrospective Peace', question: "If you could send one word of quiet reassurance back to yourself from five years ago, what would it be?" },
  { id: 'ora-36', category: 'The Present Truth', question: "What is the most honest thing you could admit to yourself about where you are right now?" },
];

/**
 * Deterministic hash based on string input (e.g. date + user/salt).
 * Guarantees questions remain 100% stable throughout the local calendar day.
 */
export function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Generate 3 deterministic daily questions for dateStr.
 * Pinned questions replace daily slots from the top.
 */
export function getDailyQuestions(dateStr, allQuestions = [], pinnedIds = [], seedKey = '') {
  const pool = allQuestions.filter(q => !pinnedIds.includes(q.id));
  if (pool.length === 0) return allQuestions.slice(0, 3);

  const seed = hashString(`${dateStr}:${seedKey}`);
  const picked = [];

  // Seeded deterministic selection
  for (let i = 0; i < pool.length && picked.length < 3; i++) {
    const index = (seed + i * 13) % pool.length;
    const item = pool[index];
    if (item && !picked.some(p => p.id === item.id)) {
      picked.push(item);
    }
  }

  // Pinned questions replace daily slots from the top (up to 3)
  const pinnedQuestions = allQuestions.filter(q => pinnedIds.includes(q.id));
  const result = [...pinnedQuestions.slice(0, 3)];
  for (const q of picked) {
    if (result.length >= 3) break;
    if (!result.some(r => r.id === q.id)) {
      result.push(q);
    }
  }

  return result;
}
