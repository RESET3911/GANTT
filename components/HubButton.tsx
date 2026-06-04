// ST APPS 共通: 左上に固定表示する HUB へ戻るボタン
export default function HubButton() {
  return (
    <a
      href="https://RESET3911.github.io/ST_HUB/"
      aria-label="HUBへ戻る"
      className="fixed top-2 left-2 z-[45] flex items-center gap-1 rounded-full border border-gray-200 bg-white/85 px-2.5 py-1.5 text-xs font-bold text-gray-600 shadow-md backdrop-blur-sm transition-transform active:scale-95"
    >
      <span className="text-sm leading-none">🏠</span>
      <span>HUB</span>
    </a>
  );
}
