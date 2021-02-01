import { appId, channel, token } from "./secrets.js";
import {
  querySelector,
  renderButtons,
  renderParticipants,
  renderUserId,
} from "./modules/ui.js";

/**
 * @typedef {import("agora-rtc-sdk-ng").IAgoraRTCClient} IAgoraRTCClient
 * @typedef {import("agora-rtc-sdk-ng").IAgoraRTCRemoteUser} IAgoraRTCRemoteUser
 * @typedef {import("agora-rtc-sdk-ng").IMicrophoneAudioTrack} IMicrophoneAudioTrack
 * @typedef {import("agora-rtc-sdk-ng").UID} UID
 * @typedef {import("agora-rtc-sdk-ng")["default"]} AgoraRTC
 */

/**
 * @typedef {typeof state} AppState
 */

/** @type {AgoraRTC} */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// eslint-disable-next-line prefer-destructuring
const AgoraRTC = window.AgoraRTC;

// ----------------------------------------------------------------

const state = {
  /**
   * For the local client.
   * @type {IAgoraRTCClient | null}
   */
  client: null,

  /** @type {UID | null} */
  currentUserId: null,

  joined: false,

  /**
   * For the local audio track.
   * @type {IMicrophoneAudioTrack | null}
   */
  localAudioTrack: null,

  /** @type {Set<IAgoraRTCRemoteUser>} */
  participants: new Set(),

  published: false,

  /** @type {Set<IAgoraRTCRemoteUser>} */
  speakers: new Set(),
};

main();

// ----------------------------------------------------------------

/**
 * Entry point.
 */
function main() {
  const client = createLocalClient();
  state.client = client;

  renderButtons(state);
  renderUserId(state);
  renderParticipants(state);

  querySelector("#join", HTMLButtonElement).onclick = onJoinClick;
  querySelector("#publish", HTMLButtonElement).onclick = onPublishClick;
  querySelector("#unpublish", HTMLButtonElement).onclick = onUnpublishClick;
  querySelector("#leave", HTMLButtonElement).onclick = onLeaveClick;

  client.on("user-joined", onAgoraUserJoined);
  client.on("user-left", onAgoraUserLeft);
  client.on("user-published", onAgoraUserPublished);
  client.on("user-unpublished", onAgoraUserUnpublished);
}

async function onJoinClick() {
  if (!state.client) {
    throw new Error("Client must be ready");
  }

  const uid = await state.client.join(appId, channel, token, null);

  state.currentUserId = uid;
  state.joined = true;
  renderButtons(state);
  renderUserId(state);
}

async function onPublishClick() {
  if (!state.client) {
    throw new Error("Client must be ready");
  }

  // Create an audio track from the audio sampled by a microphone.
  const localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
  // Publish the local audio track to the channel.
  await state.client.publish([localAudioTrack]);

  state.localAudioTrack = localAudioTrack;
  state.published = true;
  renderButtons(state);
}

async function onUnpublishClick() {
  if (!state.client) {
    throw new Error("Client must be ready");
  }

  await state.client.unpublish();

  state.published = false;
  renderButtons(state);
}

async function onLeaveClick() {
  if (!state.client) {
    throw new Error("Client must be ready");
  }

  if (state.localAudioTrack) {
    // Destroy the local audio and track.
    state.localAudioTrack.close();
  }

  // Leave the channel.
  await state.client.leave();

  state.currentUserId = null;
  state.joined = false;
  state.localAudioTrack = null;
  state.participants.clear();
  state.published = false;
  renderButtons(state);
  renderUserId(state);
  renderParticipants(state);
}

/**
 * @param {IAgoraRTCRemoteUser} user
 */
async function onAgoraUserJoined(user) {
  state.participants.add(user);
  renderParticipants(state);
}

/**
 * @param {IAgoraRTCRemoteUser} user
 */
async function onAgoraUserLeft(user) {
  state.participants.delete(user);
  renderParticipants(state);
}

/**
 * @param {IAgoraRTCRemoteUser} user
 * @param {"audio" | "video"} mediaType
 */
async function onAgoraUserPublished(user, mediaType) {
  if (!state.client) {
    throw new Error("Client must be ready");
  }

  state.speakers.add(user);
  renderParticipants(state);

  // Subscribe to a remote user.
  await state.client.subscribe(user, mediaType);

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
}

/**
 * @param {IAgoraRTCRemoteUser} user
 */
async function onAgoraUserUnpublished(user) {
  state.speakers.delete(user);
  renderParticipants(state);

  // Get the dynamically created DIV container.
  // (I didn't find what this DIV is in the document)
  const playerContainer = document.getElementById(String(user.uid));
  if (playerContainer) {
    // Destroy the container.
    playerContainer.remove();
  }
}

function createLocalClient() {
  const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
  return client;
}
