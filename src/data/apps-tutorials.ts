/**
 * Apps & Tutorials List
 * Collection of useful Mac apps and tutorials
 */

export interface AppTutorial {
  id: string;
  title: string;
  description: string;
  logo: string; // emoji for now
  category: "app" | "tutorial";
  platform: "macOS" | "Web" | "Multi";
  link?: string; // Optional link to tutorial page
}

export const APPS_TUTORIALS: AppTutorial[] = [
  {
    id: "vscode-transparent",
    title: "Make VS Code Transparent",
    description: "Transform your VS Code editor with beautiful transparency effects. Learn how to configure opacity and create a stunning coding environment.",
    logo: "💻",
    category: "tutorial",
    platform: "macOS",
    link: "/apps/vscode-transparency",
  },
  {
    id: "animated-wallpapers",
    title: "Animated Wallpapers",
    description: "Transform your Mac desktop with stunning animated wallpapers featuring Matrix effects and beautiful landscapes. Turn your desktop into a living canvas.",
    logo: "🎬",
    category: "app",
    platform: "macOS",
  },
  {
    id: "youtube-downloader",
    title: "YouTube Downloader & Trimmer",
    description: "Download and trim YouTube videos in up to 4K quality. Extract clips, save your favorite content, and watch offline anytime.",
    logo: "🎥",
    category: "app",
    platform: "Web",
  },
  {
    id: "window-management",
    title: "Advanced Window Management",
    description: "Master window management on Mac with keyboard shortcuts and custom layouts. Boost your productivity with snap-to-grid functionality.",
    logo: "🪟",
    category: "tutorial",
    platform: "macOS",
  },
  {
    id: "menubar-calendar",
    title: "Custom Menu Bar Calendar",
    description: "Add a beautiful, customizable calendar to your Mac menu bar. Track events, set reminders, and stay organized without leaving your workflow.",
    logo: "📅",
    category: "app",
    platform: "macOS",
  },
  {
    id: "terminal-customization",
    title: "Terminal Customization Guide",
    description: "Transform your terminal into a beautiful, productive environment. Learn to customize colors, fonts, and add useful plugins for an enhanced CLI experience.",
    logo: "⚡",
    category: "tutorial",
    platform: "macOS",
  },
  {
    id: "clipboard-manager",
    title: "Clipboard History Manager",
    description: "Never lose copied content again. Access your clipboard history with a simple shortcut and paste anything from your copy history.",
    logo: "📋",
    category: "app",
    platform: "macOS",
  },
  {
    id: "screen-recording",
    title: "Professional Screen Recording",
    description: "Learn how to create professional screen recordings with high-quality audio. Perfect for tutorials, presentations, and content creation.",
    logo: "🎬",
    category: "tutorial",
    platform: "macOS",
  },
  {
    id: "spotify-widgets",
    title: "Desktop Spotify Widgets",
    description: "Add beautiful floating Spotify widgets to your desktop. Control playback, view lyrics, and see album art without opening the app.",
    logo: "🎵",
    category: "app",
    platform: "macOS",
  },
  {
    id: "automation-workflows",
    title: "Automation Workflows",
    description: "Automate repetitive tasks on your Mac with powerful workflow automation. Save time and increase productivity with custom scripts and shortcuts.",
    logo: "🤖",
    category: "tutorial",
    platform: "macOS",
  },
];

/**
 * Get app/tutorial by ID
 */
export function getAppTutorialById(id: string): AppTutorial | undefined {
  return APPS_TUTORIALS.find((item) => item.id === id);
}

/**
 * Filter by category
 */
export function getAppTutorialsByCategory(
  category: "app" | "tutorial"
): AppTutorial[] {
  return APPS_TUTORIALS.filter((item) => item.category === category);
}

/**
 * Filter by platform
 */
export function getAppTutorialsByPlatform(
  platform: "macOS" | "Web" | "Multi"
): AppTutorial[] {
  return APPS_TUTORIALS.filter((item) => item.platform === platform);
}
