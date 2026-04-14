// Filled cat icon — matches Lucide Cat but with solid body and white cutout features
export function CatFilled({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className}>
      {/* Body — filled with current text color */}
      <path
        d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3-9-7.56c0-1.25.5-2.4 1-3.44 0 0-1.89-6.42-.5-7 1.39-.58 4.72.23 6.5 2.23A9.04 9.04 0 0 1 12 5Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Eyes and nose — white cutouts */}
      <circle cx="8" cy="14" r="0.75" fill="white" />
      <circle cx="16" cy="14" r="0.75" fill="white" />
      <path d="M11.25 16.25h1.5L12 17l-.75-.75Z" fill="white" />
    </svg>
  );
}
