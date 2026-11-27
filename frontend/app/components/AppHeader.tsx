import Icon from "./ui/Icon";

function Logo() {
  return (
    <span className="grid size-8 place-items-center rounded-[10px] bg-linear-to-br from-[#5b8cff] to-[#2f5be8] text-white shadow-[var(--shadow-sm)]">
      <Icon name="house" className="size-[18px]" />
    </span>
  );
}

/** Kopfleiste mit Logo – „Abmelden“ erscheint nur, wenn jemand angemeldet ist. */
export default function AppHeader({ onLogout }: { onLogout?: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2.5 px-4 sm:px-6">
        <Logo />
        <span className="text-[15px] font-semibold tracking-tight">Familienserver</span>
        {onLogout && (
          <button type="button" onClick={onLogout} className="btn btn-ghost btn-sm ml-auto -mr-2">
            <Icon name="log-out" />
            Abmelden
          </button>
        )}
      </div>
    </header>
  );
}
