async function request(path = "", options = {}) {
  let response;
  try {
    response = await fetch(`/tasks${path}`, {
      ...options,
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new Error(
      "Сервер не отвечает. Проверьте подключение и повторите попытку.",
    );
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      body?.error || `Ошибка запроса (${response.status}). Попробуйте ещё раз.`,
    );
  }
  return response.status === 204 ? null : response.json();
}

export const api = {
  list: () => request(),
  create: (task) => request("", { method: "POST", body: JSON.stringify(task) }),
  updateStatus: (id, status) =>
    request(`/${id}`, { method: "PUT", body: JSON.stringify({ status }) }),
  remove: (id) => request(`/${id}`, { method: "DELETE" }),
};
