const API_BASE_URL = 'http://localhost:3000';

export const fetchHelloWorld = async (): Promise<string> => {
  const response = await fetch(`${API_BASE_URL}/`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch hello world');
  }
  
  return response.text();
};