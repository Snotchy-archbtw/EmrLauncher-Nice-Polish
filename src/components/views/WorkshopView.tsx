import { useState, useEffect, memo, useCallback, useRef, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI, useAudio, useConfig, GameContext } from '../../context/LauncherContext';
import { TauriService } from '../../services/TauriService';

const REGISTRY_URL = 'https://raw.githubusercontent.com/LCE-Hub/LCE-Workshop/refs/heads/main/registry.json';
const RAW_BASE = 'https://raw.githubusercontent.com/LCE-Hub/LCE-Workshop/refs/heads/main';
const CATEGORY_TABS = ['Skin', 'Texture', 'World', 'Mod', 'DLC'] as const;
const ALL_TABS = [...CATEGORY_TABS, 'Search'] as const;
type TabType = typeof ALL_TABS[number];

interface RegistryPackage {
  id: string;
  name: string;
  author: string;
  description: string;
  category: string[];
  thumbnail: string;
  zips: Record<string, string>;
  version: string;
}

const COLS = 4;

const WorkshopView = memo(function WorkshopView() {
  const { setActiveView } = useUI();
  const { playPressSound, playBackSound } = useAudio();
  const config = useConfig();
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<TabType>('Skin');
  const [allPackages, setAllPackages] = useState<RegistryPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [selectedPkg, setSelectedPkg] = useState<RegistryPackage | null>(null);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(REGISTRY_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setAllPackages(data.packages ?? []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message ?? 'Failed to load registry');
        setLoading(false);
      });
  }, []);

  const filteredItems = allPackages.filter((pkg) => {
    const matchesTab = activeTab === 'Search' ? true : pkg.category.includes(activeTab);
    if (!matchesTab) return false;
    if (!search.trim()) return activeTab === 'Search' ? false : true;
    const q = search.toLowerCase();
    return (
      pkg.name.toLowerCase().includes(q) ||
      pkg.author.toLowerCase().includes(q) ||
      pkg.description.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    setFocusedIdx(null);
    if (activeTab === 'Search') {
      setTimeout(() => searchRef.current?.focus(), 50);
    } else {
      setSearch('');
    }
  }, [activeTab]);

  useEffect(() => {
    if (focusedIdx !== null && gridRef.current) {
      const el = gridRef.current.querySelector(`[data-card="${focusedIdx}"]`) as HTMLElement;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIdx]);

  const cycleTab = useCallback((direction: 'next' | 'prev') => {
    playPressSound();
    setActiveTab((prev) => {
      const idx = ALL_TABS.indexOf(prev);
      if (direction === 'next') return ALL_TABS[(idx + 1) % ALL_TABS.length];
      return ALL_TABS[(idx - 1 + ALL_TABS.length) % ALL_TABS.length];
    });
  }, [playPressSound]);

  const selectTab = useCallback((tab: TabType) => {
    if (tab !== activeTab) {
      playPressSound();
      setActiveTab(tab);
    }
  }, [activeTab, playPressSound]);

  const openModal = useCallback((pkg: RegistryPackage) => {
    playPressSound();
    setSelectedPkg(pkg);
  }, [playPressSound]);

  const closeModal = useCallback(() => {
    playBackSound();
    setSelectedPkg(null);
  }, [playBackSound]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedPkg) return;

      const isSearchInput = document.activeElement === searchRef.current;
      if (isSearchInput) {
        if (e.key === 'Escape') { setSearch(''); containerRef.current?.focus(); }
        return;
      }

      const count = filteredItems.length;
      if (e.key === 'Escape' || e.key === 'Backspace') {
        playBackSound(); setActiveView('main'); return;
      }
      if (e.key === 'e' || e.key === 'E') { cycleTab('next'); return; }
      if (e.key === 'q' || e.key === 'Q') { cycleTab('prev'); return; }

      if (count === 0) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setFocusedIdx((p) => Math.min((p ?? -1) + 1, count - 1));
        playPressSound();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setFocusedIdx((p) => Math.max((p ?? 1) - 1, 0));
        playPressSound();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIdx((p) => Math.min((p ?? -COLS) + COLS, count - 1));
        playPressSound();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIdx((p) => Math.max((p ?? COLS) - COLS, 0));
        playPressSound();
      } else if (e.key === 'Enter' && focusedIdx !== null) {
        const pkg = filteredItems[focusedIdx];
        if (pkg) openModal(pkg);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playBackSound, playPressSound, setActiveView, cycleTab, filteredItems, focusedIdx, selectedPkg, openModal]);

  const isSearchTab = activeTab === 'Search';

  return (
    <motion.div
      ref={containerRef}
      tabIndex={0}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: config.animationsEnabled ? 0.3 : 0 }}
      className="flex flex-col items-center w-full max-w-6xl relative font-['Mojangles'] text-white select-none outline-none focus:outline-none"
    >
      <h2 className="text-2xl text-white mc-text-shadow mt-4 mb-6 border-b-2 border-[#373737] pb-2 w-[30%] max-w-[250px] text-center tracking-widest uppercase opacity-80 font-bold whitespace-nowrap px-4">
        Workshop
      </h2>

      <div className="flex items-center justify-center gap-2 mb-6 w-full flex-wrap px-4">
        {ALL_TABS.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <button
              key={tab}
              onClick={() => selectTab(tab)}
              className={`
                h-10 px-6 text-lg mc-text-shadow tracking-widest border-none outline-none cursor-pointer transition-all
                ${isActive ? 'text-[#FFFF55] scale-105' : 'text-white hover:text-[#FFFF55] hover:scale-105'}
              `}
              style={{
                backgroundImage: isActive
                  ? "url('/images/button_highlighted.png')"
                  : "url('/images/Button_Background.png')",
                backgroundSize: '100% 100%',
                imageRendering: 'pixelated',
              }}
            >
              {tab.toUpperCase()}
            </button>
          );
        })}
      </div>

      <div
        className="w-[98%] flex-1 relative overflow-hidden"
        style={{
          minHeight: '500px',
        }}
      >
        <AnimatePresence mode="wait">
          {isSearchTab ? (
            <motion.div
              key="search-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute inset-0 flex flex-col pt-2"
            >
              <div className="flex items-center gap-3 px-6 pb-4">
                <div
                  className="flex items-center flex-1 h-12 px-4 border-2 border-[#444] bg-black/40 rounded shadow-inner"
                  style={{
                    backgroundImage: "url('/images/Button_Background2.png')",
                    backgroundSize: '100% 100%',
                    imageRendering: 'pixelated',
                  }}
                >
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setFocusedIdx(null); }}
                    placeholder="ENTER KEYWORDS..."
                    spellCheck={false}
                    autoFocus
                    className="bg-transparent border-none outline-none text-white text-lg mc-text-shadow w-full placeholder-white/40 font-['Mojangles'] tracking-widest"
                  />
                  {search && (
                    <button
                      onClick={() => { setSearch(''); searchRef.current?.focus(); }}
                      className="text-white/60 hover:text-white text-lg ml-2 bg-transparent border-none outline-none cursor-pointer mc-text-shadow"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div ref={gridRef} className="flex-1 overflow-y-auto p-6 scroll-smooth">
                {!search.trim() ? (
                  <div className="flex flex-col items-center justify-center h-[200px] opacity-40">
                    <span className="text-xl mc-text-shadow tracking-widest uppercase">Start typing to search...</span>
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-2xl text-[#E0E0E0] mc-text-shadow uppercase tracking-widest opacity-60">No results</span>
                  </div>
                ) : (
                  <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
                    {filteredItems.map((pkg, i) => (
                      <PackageCard
                        key={pkg.id}
                        pkg={pkg}
                        index={i}
                        focused={focusedIdx === i}
                        onHover={() => setFocusedIdx(i)}
                        onClick={() => openModal(pkg)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ) : loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl text-[#FFFF55] mc-text-shadow tracking-widest animate-pulse uppercase">Searching Archives...</span>
            </motion.div>
          ) : error ? (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl text-red-500 mc-text-shadow uppercase tracking-widest">{error}</span>
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              ref={gridRef}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="absolute inset-0 overflow-y-auto p-6 scroll-smooth"
            >
              {filteredItems.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <span className="text-2xl text-[#E0E0E0] mc-text-shadow uppercase tracking-widest opacity-40">Empty category</span>
                </div>
              ) : (
                <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
                  {filteredItems.map((pkg, i) => (
                    <PackageCard
                      key={pkg.id}
                      pkg={pkg}
                      index={i}
                      focused={focusedIdx === i}
                      onHover={() => setFocusedIdx(i)}
                      onClick={() => openModal(pkg)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="w-full mt-6 mb-4 flex justify-center">
        <button
          onClick={() => { playBackSound(); setActiveView('main'); }}
          className="w-72 h-10 flex items-center justify-center text-xl mc-text-shadow hover:text-[#FFFF55] text-white border-none outline-none transition-all"
          style={{ backgroundImage: "url('/images/Button_Background.png')", backgroundSize: '100% 100%', imageRendering: 'pixelated' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundImage = "url('/images/button_highlighted.png')"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundImage = "url('/images/Button_Background.png')"; }}
        >
          Back
        </button>
      </div>

      <AnimatePresence>
        {selectedPkg && (
          <PackageModal pkg={selectedPkg} onClose={closeModal} playPressSound={playPressSound} />
        )}
      </AnimatePresence>
    </motion.div>
  );
});

function PackageCard({ pkg, index, focused, onHover, onClick }: {
  pkg: RegistryPackage;
  index: number;
  focused: boolean;
  onHover: () => void;
  onClick: () => void;
}) {
  const thumbnailUrl = `${RAW_BASE}/${pkg.id}/${pkg.thumbnail}`;
  const [imgError, setImgError] = useState(false);

  return (
    <div
      data-card={index}
      onMouseEnter={onHover}
      onClick={onClick}
      className={`flex flex-col cursor-pointer transition-all border-2 ${focused ? 'border-[#FFFF55] scale-105 z-10' : 'border-[#333] hover:border-[#FFFF55]'} rounded-sm overflow-hidden bg-black/40`}
      style={{
        backgroundImage: "url('/images/frame_background.png')",
        backgroundSize: '100% 100%',
        imageRendering: 'pixelated',
        boxShadow: focused ? '0 0 20px rgba(255, 255, 85, 0.2)' : 'none',
      }}
    >
      <div className="w-full h-[120px] relative flex items-center justify-center overflow-hidden bg-black/50 border-b border-[#333]">
        {imgError ? (
          <span className="text-[#555] text-sm mc-text-shadow uppercase tracking-widest">No Image</span>
        ) : (
          <img src={thumbnailUrl} alt={pkg.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform"
            style={{ imageRendering: 'pixelated' }} onError={() => setImgError(true)} />
        )}
        <div className="absolute top-1 right-1 flex gap-1">
          {pkg.category.slice(0, 1).map((c) => (
            <span key={c} className="text-[8px] bg-black/80 border border-[#555] px-1.5 py-0.5 text-[#FFFF55] mc-text-shadow uppercase tracking-tighter">{c}</span>
          ))}
        </div>
      </div>
      <div className="flex flex-col p-3 gap-1 relative bg-gradient-to-b from-transparent to-black/20">
        <span className={`text-base mc-text-shadow leading-tight truncate font-bold tracking-wide ${focused ? 'text-[#FFFF55]' : 'text-white'}`}>
          {pkg.name}
        </span>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[#A0A0A0] mc-text-shadow uppercase tracking-widest">v{pkg.version}</span>
          <span className="text-[9px] text-[#55FF55] mc-text-shadow truncate opacity-80">{pkg.author}</span>
        </div>
        <p className="text-[10px] text-[#888] mc-text-shadow leading-[1.3] line-clamp-2 min-h-[2.6em] mt-1 italic">
          {pkg.description}
        </p>
      </div>
    </div>
  );
}

function PackageModal({ pkg, onClose, playPressSound }: {
  pkg: RegistryPackage;
  onClose: () => void;
  playPressSound: () => void;
}) {
  const thumbnailUrl = `${RAW_BASE}/${pkg.id}/${pkg.thumbnail}`;
  const [imgError, setImgError] = useState(false);
  const [modalFocus, setModalFocus] = useState<'install' | 'close'>('install');
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    if (showInstall) return; //neo: let install modal handle keys
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Backspace') {
        onClose();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Tab') {
        e.preventDefault();
        playPressSound();
        setModalFocus((p) => p === 'install' ? 'close' : 'install');
      } else if (e.key === 'Enter') {
        if (modalFocus === 'close') onClose();
        else if (modalFocus === 'install') setShowInstall(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalFocus, showInstall, onClose, playPressSound]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="flex flex-col w-[640px] max-h-[85vh] overflow-hidden font-['Mojangles'] border-2 border-[#555] rounded-sm"
          style={{
            backgroundImage: "url('/images/frame_background.png')",
            backgroundSize: '100% 100%',
            imageRendering: 'pixelated',
          }}
        >
          <div className="w-full h-[240px] flex-shrink-0 bg-black/60 overflow-hidden relative border-b border-[#444]">
            {imgError ? (
              <div className="absolute inset-0 flex items-center justify-center opacity-20">
                <span className="text-4xl mc-text-shadow uppercase tracking-widest">No Image</span>
              </div>
            ) : (
              <img src={thumbnailUrl} alt={pkg.name} className="w-full h-full object-cover"
                style={{ imageRendering: 'pixelated' }} onError={() => setImgError(true)} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            <div className="absolute bottom-4 left-6 right-6">
              <span className="text-3xl text-white mc-text-shadow block leading-tight tracking-wide font-bold">{pkg.name}</span>
              <span className="text-base text-[#FFFF55] mc-text-shadow uppercase tracking-widest opacity-90">By {pkg.author}</span>
            </div>
          </div>

          <div className="flex flex-col p-6 gap-6 overflow-y-auto flex-1">
            <div className="space-y-2">
              <span className="text-[10px] text-[#666] mc-text-shadow uppercase tracking-[0.2em] font-bold">Project Description</span>
              <p className="text-sm text-[#C0C0C0] mc-text-shadow leading-relaxed italic opacity-90">{pkg.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-8 pt-4 border-t border-[#333]">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-[#666] mc-text-shadow uppercase tracking-[0.2em] font-bold">Metadata</span>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#888] mc-text-shadow">Version:</span>
                    <span className="text-white mc-text-shadow">v{pkg.version}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#888] mc-text-shadow">Package ID:</span>
                    <span className="text-[#55FF55] mc-text-shadow truncate ml-2">{pkg.id}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-[#666] mc-text-shadow uppercase tracking-[0.2em] font-bold">Categories</span>
                <div className="flex flex-wrap gap-1.5">
                  {pkg.category.map((c) => (
                    <span key={c} className="text-[10px] bg-black/60 border border-[#444] px-2 py-0.5 text-[#A0A0A0] mc-text-shadow uppercase tracking-widest">{c}</span>
                  ))}
                </div>
              </div>
            </div>

            {Object.keys(pkg.zips).length > 0 && (
              <div className="flex flex-col gap-3 pt-4 border-t border-[#333]">
                <span className="text-[10px] text-[#666] mc-text-shadow uppercase tracking-[0.2em] font-bold">Files</span>
                <div className="space-y-1.5">
                  {Object.entries(pkg.zips).map(([file, dest]) => (
                    <div key={file} className="flex items-center justify-between gap-4 bg-black/20 p-2 rounded-sm border border-[#222]">
                      <span className="text-xs text-[#A0A0A0] mc-text-shadow font-mono">{file}</span>
                      {dest && <span className="text-[9px] text-[#fff] mc-text-shadow truncate uppercase tracking-tighter">{dest}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-4 pt-4 mt-auto">
              <button
                onMouseEnter={() => setModalFocus('install')}
                onClick={() => setShowInstall(true)}
                className={`flex-1 h-12 flex items-center justify-center text-xl mc-text-shadow border-none outline-none cursor-pointer transition-all ${modalFocus === 'install' ? 'text-[#FFFF55] scale-105' : 'text-white'}`}
                style={{
                  backgroundImage: modalFocus === 'install' ? "url('/images/button_highlighted.png')" : "url('/images/Button_Background.png')",
                  backgroundSize: '100% 100%',
                  imageRendering: 'pixelated',
                }}
              >
                INSTALL
              </button>
              <button
                onMouseEnter={() => setModalFocus('close')}
                onClick={onClose}
                className={`w-36 h-12 flex items-center justify-center text-xl mc-text-shadow border-none outline-none cursor-pointer transition-all ${modalFocus === 'close' ? 'text-[#FFFF55] scale-105' : 'text-white'}`}
                style={{
                  backgroundImage: modalFocus === 'close' ? "url('/images/button_highlighted.png')" : "url('/images/Button_Background.png')",
                  backgroundSize: '100% 100%',
                  imageRendering: 'pixelated',
                }}
              >
                BACK
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {showInstall && (
          <InstallModal pkg={pkg} onClose={() => setShowInstall(false)} playPressSound={playPressSound} />
        )}
      </AnimatePresence>
    </>
  );
}

function InstallModal({ pkg, onClose, playPressSound }: {
  pkg: RegistryPackage;
  onClose: () => void;
  playPressSound: () => void;
}) {
  const game = useContext(GameContext);
  const availableEditions = game?.editions.filter(e => game.installs.includes(e.id)) || [];

  const [focusedIdx, setFocusedIdx] = useState(0);
  const [status, setStatus] = useState<'idle' | 'installing' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (status === 'installing') return;
      if (status === 'success') {
        if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'Enter') onClose();
        return;
      }

      if (e.key === 'Escape' || e.key === 'Backspace') {
        onClose();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        playPressSound();
        setFocusedIdx((p) => Math.max(p - 1, 0));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        playPressSound();
        setFocusedIdx((p) => Math.min(p + 1, availableEditions.length - 1));
      } else if (e.key === 'Enter') {
        if (availableEditions.length > 0) {
          installTo(availableEditions[focusedIdx].id);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [availableEditions, focusedIdx, status, onClose, playPressSound]);

  const installTo = async (instanceId: string) => {
    setStatus('installing');
    setErrorMsg(null);
    playPressSound();
    try {
      await TauriService.workshopInstall(instanceId, pkg.id, pkg.zips);
      setStatus('success');
    } catch (e: any) {
      console.error(e);
      setStatus('error');
      setErrorMsg(typeof e === 'string' ? e : e.message);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80"
      onClick={status !== 'installing' ? onClose : undefined}
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col w-[520px] font-['Mojangles'] text-white border-2 border-[#555] rounded-sm overflow-hidden"
        style={{
          backgroundImage: "url('/images/frame_background.png')",
          backgroundSize: '100% 100%',
          imageRendering: 'pixelated',
        }}
      >
        <div className="p-6 border-b border-[#555] bg-black/60">
          <span className="text-2xl mc-text-shadow block font-bold tracking-wide">INSTALL CONTENT</span>
          <span className="text-sm text-[#A0A0A0] mc-text-shadow uppercase tracking-widest opacity-80 mt-1">Target Edition for "{pkg.name}"</span>
        </div>

        <div className="p-4 flex flex-col gap-2 max-h-[300px] overflow-y-auto">
          {status === 'installing' && (
            <div className="py-8 flex flex-col items-center justify-center gap-3">
              <span className="text-2xl text-[#FFFF55] mc-text-shadow animate-pulse">Installing...</span>
              <span className="text-xs text-[#A0A0A0] mc-text-shadow">Downloading and extracting assets</span>
            </div>
          )}
          {status === 'success' && (
            <div className="py-8 flex flex-col items-center justify-center gap-3">
              <span className="text-2xl text-[#55FF55] mc-text-shadow">Installed Successfully!</span>
              <span className="text-xs text-[#A0A0A0] mc-text-shadow">Press any key or click to continue</span>
            </div>
          )}
          {status === 'error' && (
            <div className="py-6 flex flex-col items-center justify-center gap-3">
              <span className="text-xl text-[#FF5555] mc-text-shadow">Installation Failed</span>
              <span className="text-xs text-[#A0A0A0] mc-text-shadow text-center">{errorMsg}</span>
              <button
                onClick={() => setStatus('idle')}
                className="mt-2 w-32 h-9 flex items-center justify-center text-sm mc-text-shadow text-white cursor-pointer"
                style={{ backgroundImage: "url('/images/Button_Background.png')", backgroundSize: '100% 100%', imageRendering: 'pixelated' }}
              >
                Retry
              </button>
            </div>
          )}

          {status === 'idle' && (
            availableEditions.length === 0 ? (
              <div className="py-6 flex items-center justify-center">
                <span className="text-[#FF5555] mc-text-shadow">No installed editions found</span>
              </div>
            ) : (
              availableEditions.map((ed, i) => (
                <div
                  key={ed.id}
                  onClick={() => installTo(ed.id)}
                  onMouseEnter={() => setFocusedIdx(i)}
                  className={`flex flex-col p-3 cursor-pointer border-2 transition-none ${focusedIdx === i ? 'border-[#FFFF55] bg-black/40' : 'border-[#444] bg-black/20'}`}
                >
                  <span className={`text-lg mc-text-shadow ${focusedIdx === i ? 'text-[#FFFF55]' : 'text-white'}`}>{ed.name}</span>
                </div>
              ))
            )
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default WorkshopView;
