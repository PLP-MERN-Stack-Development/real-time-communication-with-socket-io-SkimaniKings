import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../context/ChatContext';
import { PhoneOff, Mic, MicOff, Video, VideoOff, AlertCircle } from 'lucide-react';

const CallModal: React.FC = () => {
  const { state, endCall } = useChat();
  const { call } = state;
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(!call.isVideo);
  const [duration, setDuration] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let isMounted = true;

    const startStream = async () => {
      try {
        setPermissionError(null);
        stream = await navigator.mediaDevices.getUserMedia({
          video: call.isVideo ? true : false,
          audio: true
        });
        
        if (isMounted && localVideoRef.current && call.isVideo) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        console.error("Error accessing media devices:", err);
        if (isMounted) {
            if (err.name === 'NotAllowedError') {
                setPermissionError("Camera/Microphone access denied. Please allow permissions.");
            } else if (err.name === 'NotFoundError') {
                setPermissionError("No camera or microphone found.");
            } else {
                setPermissionError("Could not start media. " + err.message);
            }
        }
      }
    };

    if (call.isActive) {
      startStream();
    }

    return () => {
      isMounted = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [call.isActive, call.isVideo]);

  useEffect(() => {
      let interval: ReturnType<typeof setInterval>;
      if (call.status === 'connected') {
          setDuration(0);
          interval = setInterval(() => setDuration(prev => prev + 1), 1000);
      }
      return () => clearInterval(interval);
  }, [call.status]);

  if (!call.isActive) return null;

  const formatDuration = (sec: number) => {
      const min = Math.floor(sec / 60);
      const s = sec % 60;
      return `${min}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md">
      <div className="relative w-full h-full md:w-full md:max-w-5xl md:h-[90vh] bg-slate-900 md:rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-slate-800">
        
        {/* Main Video Area (Remote) */}
        <div className="flex-1 relative flex items-center justify-center bg-slate-800 overflow-hidden">
           {call.status === 'connected' ? (
               <div className="w-full h-full relative flex items-center justify-center">
                   {/* Remote Video Feed (Fake for Demo) */}
                   {call.isVideo ? (
                        <div className="w-full h-full absolute inset-0">
                            {/* Using a stock video to simulate remote user */}
                             <video 
                                autoPlay 
                                loop 
                                muted 
                                className="w-full h-full object-cover opacity-80"
                                src="https://cdn.coverr.co/videos/coverr-typing-on-computer-keyboard-2646/1080p.mp4"
                             />
                             <div className="absolute top-4 left-4 bg-black/50 px-3 py-1 rounded-full text-white text-sm backdrop-blur-sm">
                                {call.remoteUserName}
                             </div>
                        </div>
                   ) : (
                       <div className="text-center z-10">
                           <div className="relative inline-block">
                                <img 
                                    src={call.remoteUserAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Unknown'} 
                                    alt="Remote User" 
                                    className="w-32 h-32 md:w-48 md:h-48 rounded-full border-4 border-slate-700 mx-auto z-10 relative object-cover bg-slate-600"
                                />
                                {/* Audio Wave Animation */}
                                <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20"></div>
                                <div className="absolute -inset-4 bg-blue-500 rounded-full animate-pulse opacity-10"></div>
                           </div>
                           <h2 className="mt-6 text-2xl font-bold text-white">{call.remoteUserName}</h2>
                           <p className="text-green-400 mt-2 font-mono">{formatDuration(duration)}</p>
                       </div>
                   )}
               </div>
           ) : (
               <div className="text-center animate-pulse z-10">
                   <img 
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${call.remoteUserId}`}
                        alt="Calling"
                        className="w-24 h-24 rounded-full mx-auto mb-4 opacity-50 border-2 border-slate-600" 
                   />
                   <h2 className="text-xl text-white font-semibold tracking-wide">
                       {call.status === 'dialing' ? 'Calling...' : 'Ringing...'}
                   </h2>
               </div>
           )}

           {/* Permission Error Message */}
           {permissionError && (
               <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-red-900/90 text-white p-6 rounded-xl flex flex-col items-center max-w-sm text-center border border-red-500">
                   <AlertCircle className="w-8 h-8 mb-2 text-red-300" />
                   <p>{permissionError}</p>
               </div>
           )}

           {/* Local Video Overlay */}
           {call.isVideo && !isVideoOff && !permissionError && (
               <div className="absolute top-4 right-4 w-32 h-44 md:w-48 md:h-64 bg-black rounded-xl overflow-hidden border-2 border-slate-700 shadow-2xl z-20">
                   <video 
                      ref={localVideoRef} 
                      autoPlay 
                      muted 
                      playsInline 
                      className="w-full h-full object-cover transform scale-x-[-1]" 
                   />
                   <div className="absolute bottom-2 right-2 flex gap-1">
                      {isMuted && <MicOff className="w-4 h-4 text-red-500" />}
                   </div>
               </div>
           )}
        </div>

        {/* Controls Bar */}
        <div className="h-24 bg-slate-900/90 backdrop-blur border-t border-slate-800 flex items-center justify-center gap-8">
             <button 
                onClick={() => setIsMuted(!isMuted)}
                className={`p-4 rounded-full transition-all duration-200 ${isMuted ? 'bg-white text-slate-900' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
             >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
             </button>
             
             <button 
                onClick={endCall}
                className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 transform hover:scale-105 active:scale-95 transition-all shadow-lg shadow-red-900/40"
             >
                <PhoneOff className="w-8 h-8" />
             </button>

             {call.isVideo && (
                <button 
                    onClick={() => setIsVideoOff(!isVideoOff)}
                    className={`p-4 rounded-full transition-all duration-200 ${isVideoOff ? 'bg-white text-slate-900' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
                >
                    {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                </button>
             )}
        </div>
      </div>
    </div>
  );
};

export default CallModal;