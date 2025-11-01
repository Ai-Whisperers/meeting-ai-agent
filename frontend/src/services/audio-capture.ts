/**
 * Audio Capture Service
 * Handles capturing system audio and microphone, then merging them
 */

export interface AudioCaptureResult {
  systemAudioStream: MediaStream | null;
  microphoneStream: MediaStream | null;
  mergedStream: MediaStream | null;
  audioContext: AudioContext;
}

/**
 * Request permission for screen sharing with system audio
 */
export async function captureSystemAudio(): Promise<MediaStream | null> {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: false,
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        sampleRate: 24000 // OpenAI Realtime API uses 24kHz
      }
    });

    // Check if audio track is present
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.warn('No audio track in display media stream');
      return null;
    }

    console.log('System audio captured:', audioTracks[0].label);
    return stream;
  } catch (error) {
    console.error('Failed to capture system audio:', error);
    throw new Error('Failed to capture system audio. Please ensure you selected "Share system audio" in the dialog.');
  }
}

/**
 * Request permission for microphone
 */
export async function captureMicrophone(): Promise<MediaStream> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 24000 // OpenAI Realtime API uses 24kHz
      }
    });

    console.log('Microphone captured:', stream.getAudioTracks()[0].label);
    return stream;
  } catch (error) {
    console.error('Failed to capture microphone:', error);
    throw new Error('Failed to access microphone. Please grant microphone permission.');
  }
}

/**
 * Merge system audio and microphone into a single stream
 */
export function mergeAudioStreams(
  systemAudioStream: MediaStream | null,
  microphoneStream: MediaStream
): { mergedStream: MediaStream; audioContext: AudioContext } {
  const audioContext = new AudioContext({ sampleRate: 24000 });

  // Create destination for merged audio
  const destination = audioContext.createMediaStreamDestination();

  // Add microphone to destination
  const micSource = audioContext.createMediaStreamSource(microphoneStream);
  micSource.connect(destination);

  // Add system audio if available
  if (systemAudioStream) {
    const systemSource = audioContext.createMediaStreamSource(systemAudioStream);
    systemSource.connect(destination);
    console.log('Merged system audio + microphone');
  } else {
    console.log('Using microphone only (no system audio)');
  }

  return {
    mergedStream: destination.stream,
    audioContext
  };
}

/**
 * Main function to capture and merge all audio sources
 */
export async function captureAndMergeAudio(): Promise<AudioCaptureResult> {
  try {
    // First, capture microphone (always required)
    const microphoneStream = await captureMicrophone();

    // Then, try to capture system audio (optional but recommended)
    let systemAudioStream: MediaStream | null = null;
    try {
      systemAudioStream = await captureSystemAudio();
    } catch (error) {
      console.warn('System audio capture failed, continuing with microphone only:', error);
    }

    // Merge streams
    const { mergedStream, audioContext } = mergeAudioStreams(
      systemAudioStream,
      microphoneStream
    );

    return {
      systemAudioStream,
      microphoneStream,
      mergedStream,
      audioContext
    };
  } catch (error) {
    console.error('Audio capture failed:', error);
    throw error;
  }
}

/**
 * Stop all audio streams and clean up
 */
export function stopAudioCapture(result: AudioCaptureResult): void {
  result.systemAudioStream?.getTracks().forEach(track => track.stop());
  result.microphoneStream?.getTracks().forEach(track => track.stop());
  result.mergedStream?.getTracks().forEach(track => track.stop());
  result.audioContext.close();
  console.log('Audio capture stopped and cleaned up');
}
