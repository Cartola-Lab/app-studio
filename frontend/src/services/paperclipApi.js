const API_URL = process.env.REACT_APP_BACKEND_URL;

// Create a task in Paperclip (mocked)
export async function createTask(taskData) {
  const response = await fetch(`${API_URL}/api/create-task`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: taskData.title,
      description: taskData.description,
      acceptance_criteria: taskData.acceptanceCriteria,
      preview_html: taskData.previewHtml,
      preview_css: taskData.previewCss,
      preview_js: taskData.previewJs
    })
  });

  if (!response.ok) {
    throw new Error('Failed to create task');
  }

  return response.json();
}

// Get all tasks
export async function getTasks() {
  const response = await fetch(`${API_URL}/api/tasks`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch tasks');
  }
  
  return response.json();
}
