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

const state = {
  /** @type {UID | null} */
  currentUserId: null,

  joined: false,

  /** @type {Set<IAgoraRTCRemoteUser>} */
  participants: new Set(),

  published: false,
};

main();

// ----------------------------------------------------------------

function main() {
  createLocalClient();
  startListening();

  renderButtons(state);
  renderUserId(state);
  renderParticipants(state);

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

async function unpublishTracks() {
  if (!rtc.client) {
    throw new Error("Client must be ready");
  }

  await rtc.client.unpublish();
}

function startListening() {
  const { client } = rtc;
  if (!client) {
    throw new Error("Client must be ready");
  }

  client.on("user-published", async (user, mediaType) => {
    state.participants.add(user);
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
    state.participants.delete(user);
    renderParticipants(state);

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
