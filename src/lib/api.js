async function j(res) {
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
}
const JSONH = { "Content-Type": "application/json" };
export const api = {
  me: () => fetch("/api/auth/me").then(j),
  login: (userId, password) =>
    fetch("/api/auth/login", { method: "POST", headers: JSONH, body: JSON.stringify({ userId, password }) }).then(j),
  logout: () => fetch("/api/auth/logout", { method: "POST" }).then(j),
  data: () => fetch("/api/data").then(j),
  putState: (key, value) =>
    fetch("/api/state/" + key, { method: "PUT", headers: JSONH, body: JSON.stringify({ value }) }).then(j),
  // admin user management
  listUsers: () => fetch("/api/users").then(j),
  saveUser: (u) => fetch("/api/users", { method: "POST", headers: JSONH, body: JSON.stringify(u) }).then(j),
  deleteUser: (id) => fetch("/api/users", { method: "DELETE", headers: JSONH, body: JSON.stringify({ id }) }).then(j),
};
