// Colour follows the channel, so filtering never repaints the channels that remain.
// No channel is green: green is reserved for a favourable change.
export const CHANNEL_COLOURS: Record<string, string> = {
  TV: "#3b6fd8",
  "Paid Search": "#e07a2e",
  Social: "#8a5cd0",
};

export const INK = "#17233b";

export function channelColour(channel: string): string {
  return CHANNEL_COLOURS[channel] ?? INK;
}
