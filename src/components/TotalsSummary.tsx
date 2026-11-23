/** コンポーネントの props */
type Props = {
  items: { label: string; value: string }[];
};

/**
 * 合計などの数字を横に並べて見せる。
 * @param props 見出しと値の組
 * @returns {JSX.Element} 合計の一覧
 */
export function TotalsSummary({ items }: Props) {
  return (
    <dl className="grid grid-cols-3 gap-4">
      {items.map(({ label, value }) => (
        <div key={label} className="rounded-2xl bg-bg px-5 py-3 shadow-card">
          <dt className="text-xs text-sub">{label}</dt>
          <dd className="text-right text-lg font-bold tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
