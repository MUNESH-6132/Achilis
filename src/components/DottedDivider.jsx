export function DottedDivider() {
  return (
    <div className="flex items-center w-full my-8">
      <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
      <div className="flex-1 border-b border-dotted border-white/15 mx-3" />
      <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
    </div>
  );
}