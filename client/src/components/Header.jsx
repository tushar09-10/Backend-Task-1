export default function Header({ isConnected }) {
  return (
    <header className="header">
      <div className="container header-content">
        <h1 className="logo">TokenPulse</h1>
        <div className="connection-status">
          <span className={`status-dot ${isConnected ? 'connected' : ''}`} />
          <span>{isConnected ? 'Live' : 'Connecting...'}</span>
        </div>
      </div>
    </header>
  );
}
