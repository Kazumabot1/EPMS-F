import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function Home() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const email = localStorage.getItem('epmsUserEmail');

    if (!email) {
      navigate('/login');
      return;
    }

    api.get('/api/dashboard/summary', {
      params: { email },
    })
      .then(res => setData(res.data))
      .catch(() => setError('Failed to load dashboard'));
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Dashboard</h2>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!data && !error && <p>Loading...</p>}

      {data && (
        <>
          <p><b>Name:</b> {data.user.fullName}</p>
          <p><b>Email:</b> {data.user.email}</p>
          <p><b>Employee Code:</b> {data.user.employeeCode}</p>

          <hr />

          <p>Direct Reports: {data.stats.directReports}</p>
          <p>Notifications: {data.stats.unreadNotifications}</p>
          <p>KPIs: {data.stats.kpisCreated}</p>
        </>
      )}
    </div>
  );
}

export default Home;