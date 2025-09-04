'use client';

import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Pie, Scatter, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

interface AnalyticsData {
  summary: {
    totalUsers: number;
    totalTeams: number;
    correlationBalanceStep: number;
    clusters: Array<{
      clusterId: number;
      userCount: number;
      centroid: {
        stepcount: number;
        pushup: number;
        squat: number;
        balance: number;
      };
    }>;
  };
  users: any[];
  teamStats: any[];
  topPerformers: {
    engagement: any[];
    consistency: any[];
    outliers: any[];
  };
  statistics: any;
}

export default function Dashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/analytics');
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading analytics data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">No data available</div>
      </div>
    );
  }

  // Cluster Distribution Pie Chart
  const clusterPieData = {
    labels: data.summary.clusters.map(c => `Cluster ${c.clusterId}`),
    datasets: [
      {
        label: 'User Distribution',
        data: data.summary.clusters.map(c => c.userCount),
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 205, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 205, 86, 1)',
          'rgba(75, 192, 192, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Team Analytics Bar Chart
  const teamBarData = {
    labels: data.teamStats.map(t => t.team),
    datasets: [
      {
        label: 'Avg Steps',
        data: data.teamStats.map(t => t.avgStep),
        backgroundColor: 'rgba(53, 162, 235, 0.8)',
        yAxisID: 'y',
      },
      {
        label: 'Avg Pushups',
        data: data.teamStats.map(t => t.avgPushup),
        backgroundColor: 'rgba(255, 99, 132, 0.8)',
        yAxisID: 'y1',
      },
      {
        label: 'Avg Squats',
        data: data.teamStats.map(t => t.avgSquat),
        backgroundColor: 'rgba(75, 192, 192, 0.8)',
        yAxisID: 'y1',
      },
    ],
  };

  const teamBarOptions = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Teams'
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Steps'
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Pushups/Squats'
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  // Balance vs Steps Scatter Plot
  const scatterData = {
    datasets: [
      {
        label: 'Balance vs Steps',
        data: data.users.map(u => ({
          x: u.stepcount,
          y: u.balance,
        })),
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
      },
    ],
  };

  const scatterOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `Balance vs Steps Correlation: ${data.summary.correlationBalanceStep.toFixed(3)}`,
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Step Count'
        }
      },
      y: {
        title: {
          display: true,
          text: 'Balance'
        }
      }
    },
  };

  // Engagement Index Distribution
  const engagementData = {
    labels: data.users.map(u => u.username).slice(0, 20), // Show top 20 for readability
    datasets: [
      {
        label: 'Engagement Index',
        data: data.users
          .sort((a, b) => b.engagement_index - a.engagement_index)
          .slice(0, 20)
          .map(u => u.engagement_index),
        backgroundColor: 'rgba(75, 192, 192, 0.8)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  const engagementOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Top 20 Users by Engagement Index',
      },
    },
    scales: {
      x: {
        display: false, // Hide labels for better readability
      },
      y: {
        title: {
          display: true,
          text: 'Engagement Index'
        }
      }
    },
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">
          AI Data Analytics Dashboard
        </h1>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700">Total Users</h3>
            <p className="text-3xl font-bold text-blue-600">{data.summary.totalUsers}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700">Teams</h3>
            <p className="text-3xl font-bold text-green-600">{data.summary.totalTeams}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700">Clusters</h3>
            <p className="text-3xl font-bold text-purple-600">{data.summary.clusters.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700">Outliers</h3>
            <p className="text-3xl font-bold text-red-600">{data.topPerformers.outliers.length}</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Cluster Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">User Cluster Distribution</h2>
            <div className="h-80">
              <Pie data={clusterPieData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </div>

          {/* Team Analytics */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Team Performance Comparison</h2>
            <div className="h-80">
              <Bar data={teamBarData} options={{ ...teamBarOptions, maintainAspectRatio: false }} />
            </div>
          </div>

          {/* Balance vs Steps Correlation */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Balance vs Steps Correlation</h2>
            <div className="h-80">
              <Scatter data={scatterData} options={{ ...scatterOptions, maintainAspectRatio: false }} />
            </div>
          </div>

          {/* Engagement Index */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Engagement Leaders</h2>
            <div className="h-80">
              <Bar data={engagementData} options={{ ...engagementOptions, maintainAspectRatio: false }} />
            </div>
          </div>
        </div>

        {/* Top Performers Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Engagement */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Top Engagement Users</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">User</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Team</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topPerformers.engagement.slice(0, 5).map((user, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-4 py-2 text-sm text-gray-900">{user.username}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{user.team}</td>
                      <td className="px-4 py-2 text-sm font-semibold text-blue-600">
                        {user.engagement_index.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Consistency */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Most Consistent Users</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">User</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Team</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topPerformers.consistency.slice(0, 5).map((user, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-4 py-2 text-sm text-gray-900">{user.username}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{user.team}</td>
                      <td className="px-4 py-2 text-sm font-semibold text-green-600">
                        {user.activity_consistency.toFixed(6)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Cluster Details */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Cluster Analysis</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.summary.clusters.map((cluster) => (
              <div key={cluster.clusterId} className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Cluster {cluster.clusterId}
                </h3>
                <p className="text-sm text-gray-600 mb-1">Users: {cluster.userCount}</p>
                <p className="text-sm text-gray-600 mb-1">
                  Avg Steps: {cluster.centroid.stepcount.toFixed(0)}
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  Avg Pushups: {cluster.centroid.pushup.toFixed(0)}
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  Avg Squats: {cluster.centroid.squat.toFixed(0)}
                </p>
                <p className="text-sm text-gray-600">
                  Avg Balance: {cluster.centroid.balance.toFixed(0)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Outliers */}
        {data.topPerformers.outliers.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Statistical Outliers</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.topPerformers.outliers.map((user, idx) => (
                <div key={idx} className="border border-red-200 rounded-lg p-4 bg-red-50">
                  <h3 className="text-lg font-semibold text-red-700">{user.username}</h3>
                  <p className="text-sm text-gray-600">Team: {user.team}</p>
                  <p className="text-sm text-gray-600">Steps: {user.stepcount}</p>
                  <p className="text-sm text-gray-600">Pushups: {user.pushup}</p>
                  <p className="text-sm text-gray-600">Squats: {user.squat}</p>
                  <p className="text-sm text-gray-600">Balance: {user.balance}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}