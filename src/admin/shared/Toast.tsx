interface Props {
  message: string;
  icon: React.ReactNode;
  background: string;
}

export default function Toast({ message, icon, background }: Props) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '13px 20px',
        background,
        color: 'white',
        fontSize: 13,
        fontWeight: 600,
        borderRadius: 10,
        boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
        zIndex: 500,
      }}
    >
      {icon}
      {message}
    </div>
  );
}
