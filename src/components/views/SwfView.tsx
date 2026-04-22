import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useConfig, useAudio, useUI } from "../../context/LauncherContext";
import { SwfImage, SwfService } from "../../services/SwfService";

export default function SwfView() {
  const { animationsEnabled } = useConfig();
  const { playBackSound } = useAudio();
  const { setActiveView } = useUI();

  const [images, setImages] = useState<SwfImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleBack = useCallback(() => {
    playBackSound();
    setActiveView("devtools");
  }, [playBackSound, setActiveView]);

  const processFile = async (file: File) => {
    setLoading(true);
    setError(null);
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const extracted = await SwfService.extractImages(bytes);
      setImages(extracted);
      if (extracted.length === 0) {
        setError("No supported images found in SWF.");
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to process SWF");
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const getImageSrc = (img: SwfImage) => {
    if (img.type === "jpeg" || img.type === "png" || img.type === "gif") {
      const mime = img.type === "jpeg" ? "image/jpeg" : `image/${img.type}`;
      const blob = new Blob([new Uint8Array(img.data)], { type: mime });
      return URL.createObjectURL(blob);
    }
    return "";
  };

  const handleDownload = (img: SwfImage) => {
    let blob: Blob;
    let ext: string;
    if (img.type === "jpeg") {
      blob = new Blob([new Uint8Array(img.data)], { type: "image/jpeg" });
      ext = "jpg";
    } else if (img.type === "png" || img.type === "gif") {
      blob = new Blob([new Uint8Array(img.data)], { type: `image/${img.type}` });
      ext = img.type;
    } else {
      blob = new Blob([new Uint8Array(img.data)], { type: "application/octet-stream" });
      ext = "bin";
    }
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${img.name || `image_${img.id}`}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: animationsEnabled ? 0.3 : 0 }}
      className="flex flex-col items-center w-full max-w-4xl outline-none"
    >
      <div className="w-full flex justify-between items-end mb-4 border-b-2 border-[#373737] pb-2">
        <h2 className="text-2xl text-white mc-text-shadow tracking-widest uppercase opacity-80 font-bold">
          SWF Image Viewer
        </h2>
        
        <button
          onClick={handleBack}
          className="text-[#A0A0A0] hover:text-white transition-colors mc-text-shadow uppercase tracking-widest text-sm"
        >
          Return {"->"}
        </button>
      </div>

      <div
        className="w-full h-110 p-6 flex flex-col shadow-2xl relative"
        style={{
          backgroundImage: "url('/images/frame_background.png')",
          backgroundSize: "100% 100%",
          imageRendering: "pixelated",
        }}
      >
         <div className="w-full flex items-center justify-between gap-4 bg-black/40 p-4 border-2 border-[#373737] mb-4">
           <div className="flex-1">
             <label className="block w-full text-center p-3 border-2 border-dashed border-[#A0A0A0] hover:border-white hover:bg-white/5 cursor-pointer transition-colors text-[#A0A0A0] hover:text-white uppercase mc-text-shadow">
               Select SWF File
               <input 
                 type="file" 
                 accept=".swf" 
                 onChange={handleFileChange} 
                 className="hidden" 
               />
             </label>
           </div>
           {fileName && <div className="text-white mc-text-shadow truncate w-1/3 text-right">{fileName}</div>}
         </div>

         {error && (
            <div className="w-full p-3 bg-red-900/50 border-2 border-red-500 text-red-200 mc-text-shadow text-center mb-4">
              {error}
            </div>
         )}
         {loading && (
            <div className="w-full text-center text-white mc-text-shadow mb-4">Loading...</div>
         )}

         <div className="flex-1 w-full overflow-y-auto pr-2 custom-scrollbar">
           {images.length > 0 && (
             <div className="text-[#A0A0A0] mc-text-shadow mb-2 text-sm uppercase px-1">
               Found {images.length} Image(s)
             </div>
           )}
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
             {images.map((img, i) => (
               <div 
                 key={`${img.id}-${i}`} 
                 onClick={() => handleDownload(img)}
                 className="cursor-pointer bg-black/60 border-2 border-[#373737] flex flex-col p-2 relative group hover:border-white transition-colors"
                 title="Click to download"
               >
                  <div className="w-full aspect-square bg-[#202020] flex items-center justify-center overflow-hidden mb-2 pattern-checkerboard">
                    {img.type === "jpeg" || img.type === "png" || img.type === "gif" ? (
                      <img src={getImageSrc(img)} className="w-full h-full object-contain" alt={`Tag ${img.id}`} />
                    ) : (
                      <span className="text-[#A0A0A0] text-xs px-2 text-center">
                        Raw Bytes<br/>{img.type}<br/>({img.data.length} b)
                      </span>
                    )}
                  </div>
                  <div className="text-white mc-text-shadow flex flex-col uppercase text-xs truncate w-full">
                    <div className="flex justify-between w-full">
                      <span>ID: {img.id}</span>
                      <span className="text-[#A0A0A0] opacity-80">{img.type}</span>
                    </div>
                    {img.name && (
                      <span className="text-[#FFFF55] truncate w-full" title={img.name}>
                        {img.name}
                      </span>
                    )}
                  </div>
               </div>
             ))}
           </div>
         </div>
      </div>
      <style>{`
        .pattern-checkerboard {
            background-color: #2a2a2a;
            background-image: linear-gradient(45deg, #1a1a1a 25%, transparent 25%, transparent 75%, #1a1a1a 75%, #1a1a1a), 
                              linear-gradient(45deg, #1a1a1a 25%, transparent 25%, transparent 75%, #1a1a1a 75%, #1a1a1a);
            background-size: 16px 16px;
            background-position: 0 0, 8px 8px;
        }
      `}</style>
    </motion.div>
  );
}
