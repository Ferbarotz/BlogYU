const API_URL = 'http://localhost:5000/api'; // Cambia al URL real de tu backend

export async function fetchUsers(token) {
  const res = await fetch(`${API_URL}/users`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
}

export async function fetchUser(userId, token) {
  const res = await fetch(`${API_URL}/users/${userId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
}

export async function updateUser(userId, data, token) {
  const res = await fetch(`${API_URL}/users/${userId}`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function deleteUser(userId, token) {
  const res = await fetch(`${API_URL}/users/${userId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
}