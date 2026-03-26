// Lean Canvas Types
export const LEAN_CANVAS_BLOCKS = [
  {
    id: 1,
    name: "PROBLEM",
    icon: "⚠️",
    key: "problem",
    primaryQuestion: "What are the top 1-3 problems your app will solve? Be specific — real problems that real people have today.",
    followUps: ["Who experiences this problem the most?", "How are they solving it today (if at all)?"]
  },
  {
    id: 2,
    name: "CUSTOMER SEGMENTS",
    icon: "👥",
    key: "customerSegments",
    primaryQuestion: "Who are your target users? Describe them — age, profession, habits, tech level.",
    followUps: ["Are there early adopters who would use this immediately?", "Is this B2B, B2C, or both?"]
  },
  {
    id: 3,
    name: "UNIQUE VALUE PROPOSITION",
    icon: "💎",
    key: "uniqueValueProposition",
    primaryQuestion: "In one sentence: why would someone choose YOUR app over alternatives? What makes it unique?",
    followUps: ["What's the single most important benefit?"]
  },
  {
    id: 4,
    name: "SOLUTION",
    icon: "🔧",
    key: "solution",
    primaryQuestion: "Describe the core features of your app. What does it DO? (Max 3 features for MVP)",
    followUps: ["Which of these features is the absolute minimum to launch?", "Any specific interactions or workflows?"]
  },
  {
    id: 5,
    name: "CHANNELS",
    icon: "📢",
    key: "channels",
    primaryQuestion: "How will users discover and access your app? (Web, mobile, PWA, desktop?)",
    followUps: ["Any specific distribution channels? (App stores, social media, referral, direct sales)"]
  },
  {
    id: 6,
    name: "REVENUE STREAMS",
    icon: "💰",
    key: "revenueStreams",
    primaryQuestion: "How will this app make money? (Subscription, one-time, freemium, ads, commission?)",
    followUps: ["What price range are you considering?", "Is there a free tier?"]
  },
  {
    id: 7,
    name: "COST STRUCTURE",
    icon: "📊",
    key: "costStructure",
    primaryQuestion: "What are the main costs to build and run this app? (Hosting, APIs, team, marketing?)",
    followUps: ["Any budget constraints for the MVP?"]
  },
  {
    id: 8,
    name: "KEY METRICS",
    icon: "📈",
    key: "keyMetrics",
    primaryQuestion: "What numbers will tell you if the app is succeeding? (Users, revenue, retention, engagement?)",
    followUps: ["What's your target for month 1? Month 6?"]
  },
  {
    id: 9,
    name: "UNFAIR ADVANTAGE",
    icon: "🛡️",
    key: "unfairAdvantage",
    primaryQuestion: "What do YOU have that competitors can't easily copy? (Domain expertise, existing audience, unique data, partnerships?)",
    followUps: ["If you don't have one yet, that's okay — what could become your advantage over time?"]
  }
];

export const getLeanCanvasBlock = (blockNumber) => {
  return LEAN_CANVAS_BLOCKS.find(block => block.id === blockNumber) || LEAN_CANVAS_BLOCKS[0];
};
