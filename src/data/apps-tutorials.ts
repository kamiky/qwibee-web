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
    id: "youtube-downloader",
    title: "YouTube Downloader & Trimmer",
    description: "Download and trim YouTube videos in up to 4K quality. Extract clips, save your favorite content, and watch offline anytime.",
    logo: "🎥",
    category: "app",
    platform: "Web",
    link: "/apps/youtube-4k",
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
