
const app = document.getElementById("app");
const searchInput = document.getElementById("searchInput");
const breadcrumbs = document.getElementById("breadcrumbs");

const API = "https://jsonplaceholder.typicode.com";

// ----------  Утилиты  ----------
function getLocalUsers() {
  return JSON.parse(localStorage.getItem("users") || "[]");
}

function saveLocalUsers(users) {
  localStorage.setItem("users", JSON.stringify(users));
}

function addUser(name, email) {
  const users = getLocalUsers();
  const id = Date.now();
  users.push({ id, name, email, local: true, todos: [] });
  saveLocalUsers(users);
}

function deleteUser(id) {
  const users = getLocalUsers().filter((u) => u.id !== id);
  saveLocalUsers(users);
  renderCurrent();
}

function addTodoToLocalUser(userId, title) {
  const users = getLocalUsers();
  const user = users.find((u) => u.id === userId);
  if (user) {
    user.todos = user.todos || [];
    user.todos.push({
      id: Date.now(),
      title,
      completed: false,
      local: true,
    });
    saveLocalUsers(users);
  }
}

function getLocalTodos(userId) {
  const user = getLocalUsers().find((u) => u.id === userId);
  return user?.todos || [];
}

async function fetchData(endpoint) {
  const res = await fetch(`${API}/${endpoint}`);
  return res.json();
}

function renderBreadcrumbs() {
  const parts = location.hash.split("#").filter(Boolean);
  breadcrumbs.innerHTML = "";
  let path = "";
  parts.forEach((part, i) => {
    path += (i ? "#" : "") + part;
    const span = document.createElement("span");
    span.textContent = part;
    span.onclick = () => (location.hash = "#" + path);
    breadcrumbs.appendChild(span);
  });
}

// ----------  Поиск пользователей ----------
async function renderUsers(query = "") {
  app.innerHTML = "<p>Загрузка...</p>";

  let apiUsers = [];
  try {
    apiUsers = await fetchData("users");
  } catch (e) {
    apiUsers = [];
    console.warn("Не удалось получить пользователей с сервера:", e);
  }

  const localUsers = getLocalUsers();
  const q = query.toLowerCase();

  const filteredLocal = localUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q))
  );

  const filteredRemote = apiUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q))
  );

  app.innerHTML = "";

  // форма добавления нового
  const form = document.createElement("form");
  form.innerHTML = `
    <input type="text" id="userName" placeholder="Имя пользователя" required />
    <input type="email" id="userEmail" placeholder="Email" required />
    <button>Добавить</button>
  `;
  form.onsubmit = (e) => {
    e.preventDefault();
    const name = e.target.userName.value.trim();
    const email = e.target.userEmail.value.trim();
    if (!name || !email) return;
    addUser(name, email);
    e.target.reset();
    renderCurrent();
  };
  app.appendChild(form);

  if (filteredLocal.length) {
    const localTitle = document.createElement("h3");
    localTitle.textContent = "Добавленные пользователи";
    localTitle.classList.add("user-section-title");
    app.appendChild(localTitle);

    const localList = document.createElement("ul");
    filteredLocal.forEach((u) => {
      const li = document.createElement("li");
      li.innerHTML = `<b>${escapeHtml(u.name)}</b> (${escapeHtml(u.email)})
        <div>
          <button onclick="location.hash='#users#todos?userId=${u.id}'">Todos</button>
          <button onclick="location.hash='#users#posts?userId=${u.id}'">Posts</button>
          <button onclick="deleteUser(${u.id})">Удалить</button>
        </div>`;
      localList.appendChild(li);
    });
    app.appendChild(localList);

    const separator = document.createElement("hr");
    separator.classList.add("users-separator");
    app.appendChild(separator);
  }

  const remoteTitle = document.createElement("h3");
  remoteTitle.textContent = "Пользователи с сервера";
  remoteTitle.classList.add("user-section-title");
  app.appendChild(remoteTitle);

  const remoteList = document.createElement("ul");
  filteredRemote.forEach((u) => {
    const li = document.createElement("li");
    li.innerHTML = `<b>${escapeHtml(u.name)}</b> (${escapeHtml(u.email)})
      <div>
        <button onclick="location.hash='#users#todos?userId=${u.id}'">Задачи</button>
        <button onclick="location.hash='#users#posts?userId=${u.id}'">Публикации</button>
      </div>`;
    remoteList.appendChild(li);
  });
  app.appendChild(remoteList);
}

// ----------  Поиск задач ----------
async function renderTodos(userId, query = "") {
  app.innerHTML = "<p>Загрузка...</p>";
  userId = Number(userId);
  let todos = [];

  const localUser = getLocalUsers().find((u) => u.id === userId);

  if (localUser) {
    todos = getLocalTodos(userId);
  } else {
    try {
      todos = await fetchData(`todos?userId=${userId}`);
    } catch (e) {
      todos = [];
      console.warn("Не удалось получить задачи:", e);
    }
  }

  const filtered = todos.filter((t) =>
    t.title.toLowerCase().includes(query.toLowerCase())
  );

  app.innerHTML = `<h3>Задачки пользователя ${userId}</h3>`;

  if (localUser) {
    const addForm = document.createElement("form");
    addForm.classList.add("todo-add-input");
    addForm.innerHTML = `
      <input type="text" id="todoTitle" placeholder="Новая задача" required />
      <button>Добавить задачу</button>`;
    addForm.onsubmit = (e) => {
      e.preventDefault();
      const title = e.target.todoTitle.value.trim();
      if (!title) return;
      addTodoToLocalUser(userId, title);
      e.target.reset();
      renderTodos(userId, searchInput.value.trim());
    };
    app.appendChild(addForm);
  }

  const list = document.createElement("ul");
  list.classList.add("todo-list");
  list.innerHTML = filtered
    .map(
      (t) =>
        `<li>${escapeHtml(t.title)} - ${t.completed ? "✅" : "X"} ${
          t.local ? "(локально)" : ""
        }</li>`
    )
    .join("");
  app.appendChild(list);
}

// ----------  Поиск постов ----------
async function renderPosts(userId, query = "") {
  app.innerHTML = "<p>Загрузка...</p>";
  let posts = [];
  try {
    posts = await fetchData(`posts?userId=${userId}`);
  } catch (e) {
    posts = [];
    console.warn("Не удалось получить публикации:", e);
  }
  const filtered = posts.filter(
    (p) =>
      p.title.toLowerCase().includes(query) ||
      p.body.toLowerCase().includes(query)
  );

  app.innerHTML =
    `<h3>Посты пользователя ${userId}</h3><ul>` +
    filtered
      .map(
        (p) => `
      <li>
        <b>${escapeHtml(p.title)}</b>
        <p>${escapeHtml(p.body)}</p>
        <button onclick="location.hash='#users#posts#comments?postId=${p.id}'">
          Комментарии
        </button>
      </li>`
      )
      .join("") +
    "</ul>";
}

// ----------  Поиск комментариев ----------
async function renderComments(postId, query = "") {
  app.innerHTML = "<p>Загрузка...</p>";
  let comments = [];
  try {
    comments = await fetchData(`comments?postId=${postId}`);
  } catch (e) {
    comments = [];
    console.warn("Не удалось получить комментарии:", e);
  }
  const filtered = comments.filter(
    (c) =>
      c.name.toLowerCase().includes(query) ||
      c.body.toLowerCase().includes(query)
  );
  app.innerHTML =
    `<h3>Комментарии под постом ${postId}</h3><ul>` +
    filtered
      .map(
        (c) => `
      <li>
        <b>${escapeHtml(c.name)}</b> (${escapeHtml(c.email)})
        <p>${escapeHtml(c.body)}</p>
      </li>`
      )
      .join("") +
    "</ul>";
}

// ----------  Вывод пути ----------
async function renderCurrent() {
  renderBreadcrumbs();
  const hash = location.hash.slice(1);
  const query = searchInput.value.trim().toLowerCase();

  if (!hash || hash === "users") {
    await renderUsers(query);
  } else if (hash.includes("todos")) {
    const userId = new URLSearchParams(location.hash.split("?")[1]).get(
      "userId"
    );
    await renderTodos(userId, query);
  } else if (hash.includes("posts") && !hash.includes("comments")) {
    const userId = new URLSearchParams(location.hash.split("?")[1]).get(
      "userId"
    );
    await renderPosts(userId, query);
  } else if (hash.includes("comments")) {
    const postId = new URLSearchParams(location.hash.split("?")[1]).get(
      "postId"
    );
    await renderComments(postId, query);
  }
}

window.addEventListener("hashchange", renderCurrent);
searchInput.addEventListener("input", renderCurrent);

window.onload = () => {
  if (!location.hash) location.hash = "#users";
  renderCurrent();
};

// Небольшая утилита для безопасного вывода строк в HTML
function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
