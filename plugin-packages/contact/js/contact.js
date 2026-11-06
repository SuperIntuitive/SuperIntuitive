/* Adapted from superintuitive.com ContactForm / ContactInbox SQL blocks. */
(function () {
  "use strict";
  if (window.SIContact && window.SIContact.version === "1.1.0") return;
  window.SIContact = {version: "1.1.0", action, inbox};
    async function action(name, data) {
        const response = await fetch('/delegate.php', {method: 'POST', credentials: 'same-origin',
            headers: {'Content-Type': 'application/json', 'X-SI-CSRF': window.SI?.CSRF?.Token || ''},
            body: JSON.stringify(Object.assign({}, data, {KEY: 'PluginAction', plugin: 'contact', action: name}))});
        let result = await response.json();
        if (Array.isArray(result)) result = result[0];
        if (!response.ok || result.ERROR) throw new Error(result.ERROR || result.message || 'Request failed');
        return result;
    }
    function text(tag, value, parent) { const el = document.createElement(tag); el.textContent = value; parent.appendChild(el); return el; }
    async function inbox() {
        const target = document.querySelector('[data-si-contact-inbox]');
        const status = document.querySelector('[data-si-inbox-status]');
        if (!target) return;
        try {
            const result = await action('inbox', {}); target.replaceChildren();
            for (const item of result.messages) {
                const article = document.createElement('article'); target.appendChild(article);
                text('h2', item.value.subject, article); text('p', item.value.name + ' <' + item.value.email + '> · ' + item.created_at, article);
                text('pre', item.value.message, article);
                const button = text('button', 'Delete message', article); button.type = 'button';
                button.onclick = async () => { if (!confirm('Delete this message?')) return; try { await action('delete', {id: item.id}); await inbox(); } catch (error) { status.textContent = error.message; } };
            }
            status.textContent = result.messages.length ? 'Showing the latest ' + result.messages.length + ' messages.' : 'No messages.';
        } catch (error) { status.textContent = error.message; }
    }
    function initializeLegacy() {
        document.querySelectorAll('[data-si-contact]').forEach(form => {
            if (form.dataset.siBound) return; form.dataset.siBound = 'true';
            form.addEventListener('submit', async event => {
                event.preventDefault(); const button = form.querySelector('button'); const status = form.querySelector('[role=status]'); button.disabled = true;
                try { await action('submit', Object.fromEntries(new FormData(form))); form.reset(); status.textContent = 'Thank you. Your message has been received.'; }
                catch (error) { status.textContent = error.message; } finally { button.disabled = false; }
            });
        });
        document.querySelectorAll('[data-si-inbox-refresh]').forEach(button => { button.onclick = inbox; });
        inbox();
    }

  function initialize() {
    initializeLegacy();
(function () {
  const form = document.getElementById("si_contact_form");
  if (!form || form.dataset.siContactReady) return;
  form.dataset.siContactReady = "true";
  const status = document.getElementById("si_contact_status");
  const button = document.getElementById("si_contact_submit");
  const controls = Array.from(form.querySelectorAll("input, select, textarea, button"));
  function feedback(message, error) {
    status.textContent = message;
    status.classList.toggle("si-contact-error", error);
    status.setAttribute("role", error ? "alert" : "status");
  }
  if (!window.crypto || !window.crypto.getRandomValues) {
    feedback("This browser cannot submit the form securely. Please use a current browser.", true);
    return;
  }
  function newSubmission() {
    const bytes = window.crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, value => value.toString(16).padStart(2, "0")).join("");
  }
  let submission = newSubmission();
  let busy = false;
  button.disabled = false;
  form.addEventListener("input", function (event) { event.target.removeAttribute("aria-invalid"); });
  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;
    const payload = {KEY: "PluginAction", plugin: "contact", action: "submit", submission};
    ["name", "email", "topic", "message", "website"].forEach(field => { payload[field] = form.elements.namedItem(field).value; });
    busy = true;
    controls.forEach(control => { control.disabled = true; });
    button.textContent = "Sending...";
    feedback("", false);
    let errorField = null;
    try {
      if (!window.SI || !SI.CSRF || !SI.CSRF.Token) throw new Error("Refresh the page before sending your message.");
      const response = await fetch("/delegate.php", {method: "POST", credentials: "same-origin", headers: {"Content-Type": "application/json", "X-SI-CSRF": SI.CSRF.Token}, body: JSON.stringify(payload)});
      const envelope = await response.json();
      const result = Array.isArray(envelope) ? envelope[0] : envelope;
      if (!response.ok || result.ERROR) {
        if (result.field) errorField = document.getElementById("si_contact_" + result.field);
        if (result.code === "CONTACT_SUBMISSION_CONFLICT") submission = newSubmission();
        throw new Error(result.ERROR || "The message could not be sent. Please try again.");
      }
      if (!result.CONTACTSENT || typeof result.CONTACTSENT.id !== "string") throw new Error("The server did not confirm receipt. Please try again.");
      form.reset();
      submission = newSubmission();
      feedback("Thank you. Your message has been received by our team.", false);
      status.focus();
    } catch (error) {
      feedback(error.message || "The message could not be sent. Please try again.", true);
      if (errorField) errorField.setAttribute("aria-invalid", "true");
    } finally {
      busy = false;
      controls.forEach(control => { control.disabled = false; });
      button.textContent = "Send message";
      if (errorField) errorField.focus();
    }
  });
})();
(function () {
  const list = document.getElementById("si_inbox_messages");
  if (!list || list.dataset.siInboxReady) return;
  list.dataset.siInboxReady = "true";
  const status = document.getElementById("si_inbox_status");
  const counts = document.getElementById("si_inbox_counts");
  const refresh = document.getElementById("si_inbox_refresh");
  const more = document.getElementById("si_inbox_more");
  let offset = 0;
  let busy = false;
  function feedback(message, error) {
    status.textContent = message;
    status.setAttribute("role", error ? "alert" : "status");
  }
  function showCounts(data) { counts.textContent = data.total + " messages / " + data.unread + " unread"; }
  async function request(payload) {
    if (!window.SI || !SI.CSRF || !SI.CSRF.Token) throw new Error("Refresh the page to restore your session.");
    const response = await fetch("/delegate-admin.php", {method: "POST", credentials: "same-origin", headers: {"Content-Type": "application/json", "X-SI-CSRF": SI.CSRF.Token}, body: JSON.stringify(payload)});
    const result = await response.json();
    if (!response.ok || result.ERROR) {
      if (response.status === 403) { list.textContent = ""; counts.textContent = "Access denied"; more.hidden = true; }
      throw new Error(result.ERROR || "The inbox request failed. Please try again.");
    }
    return result;
  }
  function element(tag, className, text) {
    const item = document.createElement(tag);
    if (className) item.className = className;
    if (text !== undefined) item.textContent = text;
    return item;
  }
  function render(message) {
    const detail = element("details", "si-inbox-message");
    detail.dataset.id = message.id;
    const summary = element("summary");
    const badge = element("span", "si-inbox-state");
    const toggle = element("button", "si-small-button");
    toggle.type = "button";
    function setState(state) {
      message.state = state;
      badge.textContent = state === "unread" ? "Unread" : "Read";
      badge.classList.toggle("si-unread", state === "unread");
      toggle.textContent = state === "unread" ? "Mark as read" : "Mark as unread";
    }
    setState(message.state);
    const date = element("time", "", new Date(message.createdon).toLocaleString());
    date.dateTime = message.createdon;
    summary.append(element("span", "si-inbox-name", message.name), element("span", "si-inbox-topic", message.topic), date, badge);
    const email = element("p", "si-inbox-email");
    const reply = element("a", "", message.email);
    reply.href = "mailto:" + encodeURIComponent(message.email) + "?subject=" + encodeURIComponent("Re: " + message.topic);
    email.append(reply);
    const body = element("p", "si-inbox-body", message.message);
    toggle.addEventListener("click", async function () {
      toggle.disabled = true;
      feedback("", false);
      try {
        const result = await request({KEY: "PluginAction", plugin: "contact", action: "update", id: message.id, state: message.state === "unread" ? "read" : "unread"});
        if (!result.CONTACTMESSAGEUPDATED) throw new Error("The server did not confirm the update.");
        setState(result.CONTACTMESSAGEUPDATED.state);
        showCounts(result.CONTACTMESSAGEUPDATED);
      } catch (error) { feedback(error.message || "The message could not be updated.", true); }
      finally { toggle.disabled = false; }
    });
    detail.append(summary, email);
    if (message.subject) detail.append(element("p", "si-inbox-subject", message.subject));
    detail.append(body, toggle);
    return detail;
  }
  async function load(reset) {
    if (busy) return;
    busy = true;
    refresh.disabled = more.disabled = true;
    feedback("Loading messages...", false);
    try {
      const result = await request({KEY: "PluginAction", plugin: "contact", action: "inbox", offset: reset ? 0 : offset});
      const data = result.CONTACTMESSAGES;
      if (!data || !Array.isArray(data.messages)) throw new Error("The server returned an unexpected inbox response.");
      if (reset) { list.textContent = ""; offset = 0; }
      data.messages.forEach(message => list.append(render(message)));
      offset += data.messages.length;
      more.hidden = !data.hasMore;
      showCounts(data);
      feedback(data.total === 0 ? "No messages yet. New contact submissions will appear here." : "", false);
    } catch (error) { feedback(error.message || "The inbox could not be loaded.", true); }
    finally { busy = false; refresh.disabled = more.disabled = false; }
  }
  refresh.addEventListener("click", function () { load(true); });
  more.addEventListener("click", function () { load(false); });
  load(true);
})();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
  else initialize();
})();
