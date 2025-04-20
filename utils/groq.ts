// Client-side chat utility
export async function getChatResponse(message: string): Promise<string> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to get response');
    }

    return data.reply;
  } catch (error: any) {
    console.error('Error in chat:', error);
    throw new Error(error.message || "Failed to communicate with the chat service. Please try again.");
  }
} 