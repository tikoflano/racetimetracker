interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ width = '100%', height = '16px', borderRadius = '4px', style }: SkeletonProps) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius, ...style }}
    />
  );
}

export function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <div className="card" style={{ pointerEvents: 'none' }}>
      <Skeleton width="40%" height="18px" style={{ marginBottom: 10 }} />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? '60%' : '90%'}
          height="14px"
          style={{ marginBottom: i < lines - 1 ? 8 : 0 }}
        />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 4, cols = 3 }: { rows?: number; cols?: number }) {
  return (
    <table className="table">
      <thead>
        <tr>
          {Array.from({ length: cols }).map((_, i) => (
            <th key={i}><Skeleton width="60px" height="10px" /></th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, r) => (
          <tr key={r}>
            {Array.from({ length: cols }).map((_, c) => (
              <td key={c}>
                <Skeleton width={c === 0 ? '30px' : c === cols - 1 ? '70px' : '100px'} height="14px" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function SkeletonHeader() {
  return (
    <div style={{ marginBottom: 20 }}>
      <Skeleton width="50%" height="28px" style={{ marginBottom: 8 }} />
      <Skeleton width="70%" height="14px" style={{ marginBottom: 4 }} />
      <Skeleton width="40%" height="14px" />
    </div>
  );
}

export function EventViewSkeleton() {
  return (
    <div>
      <SkeletonHeader />
      <div className="section">
        <Skeleton width="60px" height="11px" style={{ marginBottom: 12 }} />
        <SkeletonCard lines={1} />
        <SkeletonCard lines={1} />
      </div>
      <div className="section">
        <Skeleton width="100px" height="11px" style={{ marginBottom: 12 }} />
        <SkeletonTable rows={4} cols={4} />
      </div>
    </div>
  );
}

export function TrackViewSkeleton() {
  return (
    <div>
      <Skeleton width="100px" height="14px" style={{ marginBottom: 16 }} />
      <Skeleton width="50%" height="28px" style={{ marginBottom: 8 }} />
      <Skeleton width="70%" height="14px" style={{ marginBottom: 20 }} />
      <div className="section">
        <Skeleton width="80px" height="11px" style={{ marginBottom: 12 }} />
        <div className="card" style={{ textAlign: 'center', padding: 24 }}>
          <Skeleton width="60px" height="14px" style={{ margin: '0 auto 8px' }} />
          <Skeleton width="160px" height="22px" style={{ margin: '0 auto 8px' }} />
          <Skeleton width="100px" height="14px" style={{ margin: '0 auto 16px' }} />
          <Skeleton width="100%" height="52px" borderRadius="12px" />
        </div>
      </div>
      <div className="section">
        <Skeleton width="60px" height="11px" style={{ marginBottom: 12 }} />
        <SkeletonCard lines={1} />
        <SkeletonCard lines={1} />
      </div>
    </div>
  );
}

export function AppSkeleton() {
  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Skeleton width="90px" height="14px" />
        <Skeleton width="80px" height="32px" borderRadius="16px" />
      </header>
      <EventViewSkeleton />
    </div>
  );
}
