/* =========================================================
   CivicVote — Online Voting System
   Client-side data layer + shared UI behaviour (localStorage)
   ========================================================= */

const DB_KEYS = {
  users: "cv_users",
  candidates: "cv_candidates",
  session: "cv_session",
  election: "cv_election"
};

/* ---------------- Seed data ---------------- */
function seedDatabase(){
  if(!localStorage.getItem(DB_KEYS.users)){
    const admin = {
      name: "Election Administrator",
      voterId: "ADMIN001",
      age: 40,
      email: "admin@civicvote.example",
      password: "admin123",
      role: "admin",
      hasVoted: false,
      votedFor: null,
      createdAt: new Date().toISOString()
    };
    localStorage.setItem(DB_KEYS.users, JSON.stringify([admin]));
  }
  if(!localStorage.getItem(DB_KEYS.candidates)){
    const candidates = [
      { id: cid(), name: "Amara Blackwood", party: "Civic Unity Party", description: "Focused on transparent local governance and public infrastructure.", votes: 0 },
      { id: cid(), name: "Rajiv Malhotra", party: "Progress Forward Alliance", description: "Advocating for education reform and small-business support.", votes: 0 },
      { id: cid(), name: "Elena Kowalski", party: "Green Horizon Coalition", description: "Championing renewable energy and sustainable city planning.", votes: 0 }
    ];
    localStorage.setItem(DB_KEYS.candidates, JSON.stringify(candidates));
  }
  if(!localStorage.getItem(DB_KEYS.election)){
    localStorage.setItem(DB_KEYS.election, JSON.stringify({ open: true, title: "2026 General Council Election" }));
  }
}
function cid(){ return "c_" + Math.random().toString(36).slice(2,9); }
function uid(){ return "u_" + Math.random().toString(36).slice(2,9); }

/* ---------------- Users ---------------- */
function getUsers(){ return JSON.parse(localStorage.getItem(DB_KEYS.users) || "[]"); }
function saveUsers(list){ localStorage.setItem(DB_KEYS.users, JSON.stringify(list)); }

function findUserByVoterId(voterId){
  return getUsers().find(u => u.voterId.toLowerCase() === String(voterId).toLowerCase());
}

function registerUser({name, voterId, age, email, password}){
  const users = getUsers();
  if(users.some(u => u.voterId.toLowerCase() === voterId.toLowerCase())){
    return { ok:false, message: "That Voter ID is already registered." };
  }
  if(users.some(u => u.email.toLowerCase() === email.toLowerCase())){
    return { ok:false, message: "That email is already registered." };
  }
  const user = {
    id: uid(), name, voterId, age: Number(age), email, password,
    role: "voter", hasVoted: false, votedFor: null,
    createdAt: new Date().toISOString()
  };
  users.push(user);
  saveUsers(users);
  return { ok:true, user };
}

function loginUser(voterId, password){
  const user = findUserByVoterId(voterId);
  if(!user || user.password !== password){
    return { ok:false, message: "Invalid Voter ID or password." };
  }
  localStorage.setItem(DB_KEYS.session, JSON.stringify({ voterId: user.voterId }));
  return { ok:true, user };
}

function logoutUser(){
  localStorage.removeItem(DB_KEYS.session);
  window.location.href = "login.html";
}

function getCurrentUser(){
  const session = JSON.parse(localStorage.getItem(DB_KEYS.session) || "null");
  if(!session) return null;
  return findUserByVoterId(session.voterId) || null;
}

function updateCurrentUser(patch){
  const current = getCurrentUser();
  if(!current) return null;
  const users = getUsers().map(u => u.voterId === current.voterId ? {...u, ...patch} : u);
  saveUsers(users);
  return findUserByVoterId(current.voterId);
}

/* ---------------- Candidates ---------------- */
function getCandidates(){ return JSON.parse(localStorage.getItem(DB_KEYS.candidates) || "[]"); }
function saveCandidates(list){ localStorage.setItem(DB_KEYS.candidates, JSON.stringify(list)); }

function addCandidate({name, party, description}){
  const list = getCandidates();
  list.push({ id: cid(), name, party, description: description || "", votes: 0 });
  saveCandidates(list);
}
function updateCandidate(id, patch){
  const list = getCandidates().map(c => c.id === id ? {...c, ...patch} : c);
  saveCandidates(list);
}
function deleteCandidate(id){
  saveCandidates(getCandidates().filter(c => c.id !== id));
}

/* ---------------- Election state ---------------- */
function getElection(){ return JSON.parse(localStorage.getItem(DB_KEYS.election) || '{"open":true,"title":"Election"}'); }
function setElection(patch){
  localStorage.setItem(DB_KEYS.election, JSON.stringify({...getElection(), ...patch}));
}

/* ---------------- Voting ---------------- */
function castVote(candidateId){
  const user = getCurrentUser();
  if(!user) return { ok:false, message:"You must be logged in to vote." };
  if(user.hasVoted) return { ok:false, message:"You have already cast your vote." };
  if(!getElection().open) return { ok:false, message:"Voting is currently closed." };

  const candidates = getCandidates();
  const target = candidates.find(c => c.id === candidateId);
  if(!target) return { ok:false, message:"Candidate not found." };

  target.votes += 1;
  saveCandidates(candidates);
  updateCurrentUser({ hasVoted:true, votedFor: candidateId });
  return { ok:true };
}

function getResults(){
  const candidates = getCandidates().slice().sort((a,b) => b.votes - a.votes);
  const totalVotes = candidates.reduce((s,c) => s + c.votes, 0);
  return { candidates, totalVotes, winner: totalVotes > 0 ? candidates[0] : null };
}

/* ---------------- Route guards ---------------- */
function requireAuth(){
  const user = getCurrentUser();
  if(!user){ window.location.href = "login.html"; return null; }
  return user;
}
function requireAdmin(){
  const user = requireAuth();
  if(!user) return null;
  if(user.role !== "admin"){ window.location.href = "dashboard.html"; return null; }
  return user;
}
function redirectIfLoggedIn(){
  const user = getCurrentUser();
  if(user){ window.location.href = user.role === "admin" ? "admin.html" : "dashboard.html"; }
}

/* ---------------- Shared nav ---------------- */
function renderNav(activePage){
  const el = document.getElementById("site-nav");
  if(!el) return;
  const user = getCurrentUser();
  const sealSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="#E4D2AE" stroke-width="1.6"><path d="M12 2l7 3v6c0 5-3.4 8.6-7 10-3.6-1.4-7-5-7-10V5l7-3z"/><path d="M9 12l2 2 4-4.2"/></svg>`;

  let linksHtml = "";
  if(!user){
    linksHtml = `
      <a href="index.html" class="${activePage==='home'?'active':''}">Home</a>
      <a href="login.html" class="btn btn-outline-light btn-sm ${activePage==='login'?'active':''}">Login</a>
      <a href="register.html" class="btn btn-primary btn-sm ${activePage==='register'?'active':''}">Register</a>
    `;
  } else if(user.role === "admin"){
    linksHtml = `
      <a href="admin.html" class="${activePage==='admin'?'active':''}">Admin Panel</a>
      <a href="results.html" class="${activePage==='results'?'active':''}">Results</a>
      <span id="nav-user-pill">${escapeHtml(user.name)}</span>
      <button class="linklike" id="nav-logout">Logout</button>
    `;
  } else {
    linksHtml = `
      <a href="dashboard.html" class="${activePage==='dashboard'?'active':''}">Dashboard</a>
      <a href="voting.html" class="${activePage==='voting'?'active':''}">Vote</a>
      <a href="results.html" class="${activePage==='results'?'active':''}">Results</a>
      <a href="profile.html" class="${activePage==='profile'?'active':''}">Profile</a>
      <button class="linklike" id="nav-logout">Logout</button>
    `;
  }

  el.innerHTML = `
    <header class="site-header">
      <nav class="nav">
        <a href="${user ? (user.role==='admin'?'admin.html':'dashboard.html') : 'index.html'}" class="brand">
          <span class="brand-mark">${sealSvg}</span>
          <span>
            <span class="brand-name">CivicVote</span>
            <span class="brand-tag">Online Voting System</span>
          </span>
        </a>
        <div class="nav-links">${linksHtml}</div>
      </nav>
    </header>
  `;

  const logoutBtn = document.getElementById("nav-logout");
  if(logoutBtn) logoutBtn.addEventListener("click", logoutUser);
}

function renderFooter(){
  const el = document.getElementById("site-footer");
  if(!el) return;
  el.innerHTML = `
    <footer class="site-footer">
      <div class="container">
        &copy; ${new Date().getFullYear()} CivicVote &mdash; A demonstration online voting system. Built with HTML, CSS &amp; JavaScript.
      </div>
    </footer>
  `;
}

/* ---------------- Utilities ---------------- */
function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}
function initials(name){
  return String(name).trim().split(/\s+/).slice(0,2).map(w => w[0].toUpperCase()).join("");
}
function showMsg(el, message, type){
  if(!el) return;
  el.textContent = message;
  el.className = "form-msg show " + type;
}

document.addEventListener("DOMContentLoaded", seedDatabase);
