/**
 * @typedef {import("../main").AppState} AppState
 */

/**
 * @param {AppState} state
 */
export function renderButtons(state) {
  const { joined, published } = state;
  querySelector("#join", HTMLButtonElement).disabled = joined;
  querySelector("#publish", HTMLButtonElement).disabled = !joined || published;
  querySelector("#unpublish", HTMLButtonElement).disabled =
    !joined || !published;
  querySelector("#leave", HTMLButtonElement).disabled = !joined;
}

/**
 * @param {AppState} state
 */
export function renderUserId(state) {
  const uid = state.currentUserId;
  querySelector("#userId", Element).textContent = uid ? String(uid) : "-";
}

/**
 * @param {AppState} state
 */
export function renderParticipants(state) {
  const elNumber = querySelector("#numOfParticipants", Element);
  elNumber.textContent = String(state.participants.size);

  const elList = querySelector("#participantList", Element);
  elList.innerHTML = "";

  // eslint-disable-next-line no-restricted-syntax
  for (const user of state.participants) {
    const el = document.createElement("LI");
    el.textContent = `${user.uid}${state.speakers.has(user) ? " 🔊" : ""}`;
    elList.appendChild(el);
  }
}

/**
 * Strict version of `el.querySelector()`.
 * @template {Element} T
 * @param {string} query
 * @param {new() => T} Constructor
 * @param {Document | Element} from
 * @returns {T}
 */
export function querySelector(query, Constructor, from = document) {
  const target = from.querySelector(query);
  if (!target) {
    throw new Error(`Query "${query}" not found`);
  }

  if (!(target instanceof Constructor)) {
    throw new Error(`"${query}" is not ${Constructor.name}`);
  }

  return target;
}
