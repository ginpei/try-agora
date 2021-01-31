import { appId, channel, token } from "./secrets.js";

/**
 * @typedef {import("agora-rtc-sdk-ng").IAgoraRTCClient} IAgoraRTCClient
 * @typedef {import("agora-rtc-sdk-ng").IAgoraRTCRemoteUser} IAgoraRTCRemoteUser
 * @typedef {import("agora-rtc-sdk-ng").IMicrophoneAudioTrack} IMicrophoneAudioTrack
 * @typedef {import("agora-rtc-sdk-ng").UID} UID
 * @typedef {import("agora-rtc-sdk-ng")["default"]} AgoraRTC
 */

/** @type {AgoraRTC} */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// eslint-disable-next-line prefer-destructuring
const AgoraRTC = window.AgoraRTC;

const rtc = {
  /**
   * For the local client.
   * @type {IAgoraRTCClient | null}
   */
  client: null,

  /**
   * For the local audio track.
   * @type {IMicrophoneAudioTrack | null}
   */
  localAudioTrack: null,
};

const options = {
  // Pass your app ID here.
  appId,
  // Set the channel name.
  channel,
  // Pass a token if your project enables the App Certificate.
  token,
};

// ----------------------------------------------------------------

/** @type {Set<IAgoraRTCRemoteUser>} */
const participants = new Set();

let joined = false;

main();

// ----------------------------------------------------------------

function main() {
  createLocalClient();
  startListening();
  renderButtons();
  renderUserId(null);
  renderParticipants();

  querySelector("#join", HTMLButtonElement).onclick = async () => {
    const uid = await joinChannel();
    renderUserId(uid);
    joined = true;
    renderButtons();
  };

  querySelector("#publish", HTMLButtonElement).onclick = async () => {
    await publishTracks();
  };

  querySelector("#leave", HTMLButtonElement).onclick = async () => {
    await leaveCall();
    joined = false;
    renderButtons();
  };
}

function createLocalClient() {
  rtc.client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
}

async function joinChannel() {
  if (!rtc.client) {
    throw new Error("Client must be ready");
  }

  const uid = await rtc.client.join(
    options.appId,
    options.channel,
    options.token,
    null
  );
  return uid;
}

async function publishTracks() {
  if (!rtc.client) {
    throw new Error("Client must be ready");
  }

  // Create an audio track from the audio sampled by a microphone.
  rtc.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
  // Publish the local audio track to the channel.
  await rtc.client.publish([rtc.localAudioTrack]);
}

function startListening() {
  const { client } = rtc;
  if (!client) {
    throw new Error("Client must be ready");
  }

  client.on("user-published", async (user, mediaType) => {
    participants.add(user);
    renderParticipants();

    // Subscribe to a remote user.
    await client.subscribe(user, mediaType);

    // If the subscribed track is audio.
    if (mediaType === "audio") {
      // Get `RemoteAudioTrack` in the `user` object.
      const remoteAudioTrack = user.audioTrack;
      if (!remoteAudioTrack) {
        throw new Error("remoteAudioTrack must be ready");
      }

      // Play the audio track. No need to pass any DOM element.
      remoteAudioTrack.play();
    }
  });

  client.on("user-unpublished", (user) => {
    participants.delete(user);
    renderParticipants();

    // Get the dynamically created DIV container.
    // (I didn't find what this DIV is in the document)
    const playerContainer = document.getElementById(String(user.uid));
    if (playerContainer) {
      // Destroy the container.
      playerContainer.remove();
    }
  });
}

async function leaveCall() {
  const { client } = rtc;
  if (!client) {
    throw new Error("Client must be ready");
  }

  if (rtc.localAudioTrack) {
    // Destroy the local audio and track.
    rtc.localAudioTrack.close();
  }

  // Leave the channel.
  await client.leave();
}

function renderButtons() {
  querySelector("#join", HTMLButtonElement).disabled = joined;
  querySelector("#publish", HTMLButtonElement).disabled = !joined;
  querySelector("#leave", HTMLButtonElement).disabled = !joined;
}

/**
 * @param {UID | null} uid
 */
function renderUserId(uid) {
  querySelector("#userId", Element).textContent = uid ? String(uid) : "-";
}

function renderParticipants() {
  const elNumber = querySelector("#numOfParticipants", Element);
  elNumber.textContent = String(participants.size);

  const elList = querySelector("#participantList", Element);
  elList.innerHTML = "";

  // eslint-disable-next-line no-restricted-syntax
  for (const user of participants) {
    const el = document.createElement("LI");
    el.textContent = String(user.uid);
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
function querySelector(query, Constructor, from = document) {
  const target = from.querySelector(query);
  if (!target) {
    throw new Error(`Query "${query}" not found`);
  }

  if (!(target instanceof Constructor)) {
    throw new Error(`"${query}" is not ${Constructor.name}`);
  }

  return target;
}
