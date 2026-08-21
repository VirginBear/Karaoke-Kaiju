export function resolveBrowserLaunchOptions(env = process.env) {
  const channel = env.KARAOKE_KAIJU_BROWSER_CHANNEL?.trim();
  const executablePath = env.KARAOKE_KAIJU_BROWSER_EXECUTABLE?.trim();

  if (channel && executablePath) {
    throw new Error('Configure only one browser channel or executable path');
  }
  if (channel) return { channel };
  if (executablePath) return { executablePath };
  return {};
}

export function parseInstalledBrowserPath(output) {
  const matches = [...String(output).matchAll(/^chrome@\S+\s+(.+?)\r?$/gm)];
  const executablePath = matches.at(-1)?.[1]?.trim();
  if (!executablePath) {
    throw new Error('Unable to find the Chrome executable path in installer output');
  }
  return executablePath;
}
