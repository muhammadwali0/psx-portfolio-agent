import api from './api';
import type { ChatRequest, ChatResponse } from './types';

function getMockChatResponse(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('shariah') || lower.includes('halal') || lower.includes('islamic')) {
    return `Under Shariah Mode, the PSX Portfolio Agent filters out companies that do not meet Islamic financial criteria. Examples of compliant equities include Meezan Bank (MEBL), Systems Limited (SYS), and Hub Power Company (HUBC). Interest-bearing items are replaced by asset-backed Government Ijarah Sukuk (GIS).`;
  }
  if (lower.includes('kse') || lower.includes('market') || lower.includes('index')) {
    return `The KSE-100 index represents the flagship performance of the Pakistan Stock Exchange. Current market sentiment is positive, supported by strong performance in technology, cement, and power sectors.`;
  }
  if (lower.includes('risk') || lower.includes('portfolio')) {
    return `You can adjust your risk settings (Conservative, Balanced, Aggressive) and capital allocations in the Portfolio tab. The agent will construct an optimized portfolio using modern portfolio theory principles.`;
  }
  return `This is a simulated response from the PSX Portfolio Agent (Mock Mode active due to missing API key). How can I assist you today?`;
}

export async function sendMessage(
  message: string,
  history: Array<{ role: string; content: string }> = [],
  shariahMode: boolean = false,
): Promise<string> {
  try {
    const body: ChatRequest = { message, history, shariah_mode: shariahMode };
    const res = await api.post<ChatResponse>('/chat', body);
    return res.data.reply;
  } catch (err) {
    console.warn('Real chat API failed, falling back to mock response:', err);
    return getMockChatResponse(message);
  }
}
