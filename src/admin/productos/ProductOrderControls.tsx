interface Props { position: number; total: number; move: (from: number, to: number) => void }

export default function ProductOrderControls({ position, total, move }: Props) {
  return <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
    <span aria-hidden="true" title="Arrastra para ordenar" style={{ color: 'var(--color-text-muted)', cursor: 'grab' }}>⠿</span>
    <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
      <span>Posición</span>
      <select
        aria-label={`Posición del producto ${position + 1}`}
        value={position + 1}
        onChange={(e) => move(position, Number(e.target.value))}
        style={{ padding: '5px 3px', border: '1px solid var(--color-border)', borderRadius: 6, background: 'white' }}
      >
        {Array.from({ length: total }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
      </select>
    </label>
  </div>;
}
