import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

export default function QRCodeView() {
  const { token } = useParams<{ token: string }>();
  const url = `${window.location.origin}/register/${token}`;

  return (
    <div className="register-page">
      <div className="register-card" style={{ textAlign: 'center' }}>
        <h2 style={{ marginBottom: 16 }}>Racer Registration</h2>
        <div style={{ background: 'white', padding: 24, borderRadius: 12, display: 'inline-block', marginBottom: 16 }}>
          <QRCodeSVG value={url} size={256} level="M" />
        </div>
        <p className="muted small-text" style={{ wordBreak: 'break-all' }}>{url}</p>
        <button className="ghost small" style={{ marginTop: 12 }} onClick={() => window.print()}>Print</button>
      </div>
    </div>
  );
}
