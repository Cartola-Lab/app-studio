const API_URL = process.env.REACT_APP_BACKEND_URL;

// Stream chat messages from the API
export async function streamChat(messages, sessionId, onChunk, onComplete, onError) {
  try {
    const response = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        session_id: sessionId
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        onComplete();
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          if (data === '[DONE]') {
            onComplete();
            return;
          }

          try {
            const parsed = JSON.parse(data);
            
            if (parsed.type === 'text_delta' && parsed.text) {
              onChunk(parsed.text);
            } else if (parsed.type === 'error') {
              onError(new Error(parsed.message));
              return;
            }
          } catch (e) {
            // Ignore JSON parse errors for non-JSON lines
          }
        }
      }
    }
  } catch (error) {
    onError(error);
  }
}

// Create a new session
export async function createSession() {
  const response = await fetch(`${API_URL}/api/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to create session');
  }
  
  return response.json();
}
