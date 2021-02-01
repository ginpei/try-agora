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

  client.on("user-joined", async (user) => {
    state.participants.add(user);
    renderParticipants(state);
  });

  client.on("user-left", async (user) => {
    state.participants.delete(user);
    renderParticipants(state);
  });

  client.on("user-published", async (user, mediaType) => {
    state.speakers.add(user);
    renderParticipants(state);

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
    state.speakers.delete(user);
    renderParticipants(state);

    // Get the dynamically created DIV container.
    // (I didn't find what this DIV is in the document)
    const playerContainer = document.getElementById(String(user.uid));
    if (playerContainer) {
      // Destroy the container.
      playerContainer.remove();
    }
  });

  querySelector("#join", HTMLButtonElement).onclick = async () => {
    const uid = await joinChannel();

    state.currentUserId = uid;
    state.joined = true;
    renderButtons(state);
    renderUserId(state);
  };

  querySelector("#publish", HTMLButtonElement).onclick = async () => {
    await publishTracks();

    state.published = true;
    renderButtons(state);
  };

  querySelector("#unpublish", HTMLButtonElement).onclick = async () => {
    await unpublishTracks();

    state.published = false;
    renderButtons(state);
  };

  querySelector("#leave", HTMLButtonElement).onclick = async () => {
    await leaveCall();

    state.currentUserId = null;
    state.joined = false;
    state.participants.clear();
    state.published = false;
    renderButtons(state);
    renderUserId(state);
    renderParticipants(state);
  };
}

function createLocalClient() {
  const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
  return client;
}

async function joinChannel() {
  if (!state.client) {
    throw new Error("Client must be ready");
  }

  const uid = await state.client.join(appId, channel, token, null);
  return uid;
}

async function publishTracks() {
  if (!state.client) {
    throw new Error("Client must be ready");
  }

  // Create an audio track from the audio sampled by a microphone.
  state.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
  // Publish the local audio track to the channel.
  await state.client.publish([state.localAudioTrack]);
}

async function unpublishTracks() {
  if (!state.client) {
    throw new Error("Client must be ready");
  }

  await state.client.unpublish();
}

async function leaveCall() {
  const { client } = state;
  if (!client) {
    throw new Error("Client must be ready");
  }

  if (state.localAudioTrack) {
    // Destroy the local audio and track.
    state.localAudioTrack.close();
  }

  // Leave the channel.
  await client.leave();
}
