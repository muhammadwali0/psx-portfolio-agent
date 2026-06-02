import api from './api';
import type { ChatRequest, ChatResponse } from './types';

export async function sendMessage(
  message: string,
  history: Array<{ role: string; content: string }> = [],
  shariahMode: boolean = false,
): Promise<string> {
  const body: ChatRequest = { message, history, shariah_mode: shariahMode };
  const res = await api.post<ChatResponse>('/chat', body);
  return res.data.reply;
}
