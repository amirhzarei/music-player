import { useEffect, useRef } from "react";
import { usePlayer } from "../state/playerState.js";

export const AudioEngineBinding: React.FC = () => {
  const { state, dispatch } = usePlayer();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>();
  const lastTrackRef = useRef<string | undefined>();

  useEffect(() => {
    audioRef.current = new Audio();
    const a = audioRef.current;
    a.preload = "auto";

    const onLoadedMetadata = () => {
      if (!isNaN(a.duration) && isFinite(a.duration)) {
        dispatch({ type: "SET_DURATION", duration: a.duration });
      }
      if (state.status === "loading") {
        attemptPlay(a);
      }
    };
    const onPlay = () => dispatch({ type: "UPDATE_STATUS", status: "playing" });
    const onPause = () => {
      if (!a.ended) dispatch({ type: "UPDATE_STATUS", status: "paused" });
    };
    const onEnded = () => dispatch({ type: "UPDATE_STATUS", status: "paused" });
    const onError = () => {
      console.error("[SAFE ENGINE] error", a.error);
      dispatch({ type: "UPDATE_STATUS", status: "error" });
    };

    a.addEventListener("loadedmetadata", onLoadedMetadata);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);
    a.addEventListener("error", onError);

    const tick = () => {
      if (a && !state.ui.seeking) {
        dispatch({ type: "SET_POSITION", position: a.currentTime });
        if (a.duration && a.duration !== state.duration) {
          dispatch({ type: "SET_DURATION", duration: a.duration });
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      a.pause();
      a.removeAttribute("src");
      a.load();
      a.removeEventListener("loadedmetadata", onLoadedMetadata);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("error", onError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    a.volume = state.muted ? 0 : state.volume;

    if (state.currentTrackId !== lastTrackRef.current) {
      if (!state.currentTrackId) {
        a.pause();
        dispatch({ type: "UPDATE_STATUS", status: "idle" });
        return;
      }
      const track = state.queue.find((t) => t.id === state.currentTrackId);
      if (!track) return;
      lastTrackRef.current = track.id;
      dispatch({ type: "SET_POSITION", position: 0 });
      dispatch({ type: "SET_DURATION", duration: 0 });
      dispatch({ type: "UPDATE_STATUS", status: "loading" });
      a.src = track.src;
      a.currentTime = 0;
      // loadedmetadata will attempt play
    } else {
      if (state.status === "playing" && a.paused) attemptPlay(a);
      else if (state.status === "paused" && !a.paused) a.pause();
    }

    if (!state.ui.seeking) {
      const diff = Math.abs(a.currentTime - state.position);
      if (diff > 0.25) a.currentTime = state.position;
    }
  }, [
    state.currentTrackId,
    state.status,
    state.volume,
    state.muted,
    state.position,
    state.ui.seeking,
    state.queue,
    dispatch,
  ]);

  return null;
};

function attemptPlay(a: HTMLAudioElement) {
  a.play().catch((err) => {
    console.warn("[SAFE ENGINE] play rejected", err?.name, err?.message);
  });
}
