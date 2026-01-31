import { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import RevenueChart from './RevenueChart';
import OrdersTable from './OrdersTable';
import AttributionBreakdown from './AttributionBreakdown';
import TrackerSetup from './TrackerSetup';
import UtmBuilder from './UtmBuilder';
import HealthBadge from './HealthBadge';
import './Dashboard.css';

const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

interface RevenueData {
  [key: string]: string | number;
  revenue: number;
  orders: number;
  aov: number;
}

function Dashboard() {
  const [tab, setTab] = useState<'overview' | 'orders' | 'setup' | 'utm'>('overview');
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  });
  const [groupBy, setGroupBy] = useState('source');
  const [attributionModel, setAttributionModel] = useState('last_touch');
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
  });

  useEffect(() => {
    if (tab === 'overview' || tab === 'orders') fetchData();
  }, [tab, dateRange, groupBy, attributionModel]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [revenueRes, ordersRes] = await Promise.all([
        fetch(
          `${API_URL}/api/attribution/revenue?startDate=${dateRange.start}&endDate=${dateRange.end}&groupBy=${groupBy}&model=${attributionModel}`,
          { credentials: 'include' }
        ),
        fetch(
          `${API_URL}/api/attribution/orders?startDate=${dateRange.start}&endDate=${dateRange.end}&limit=100`,
          { credentials: 'include' }
        ),
      ]);

      const revenueJson = await revenueRes.json();
      const ordersJson = await ordersRes.json();

      if (revenueJson.success) {
        const sorted = [...revenueJson.data].sort((a: RevenueData, b: RevenueData) => b.revenue - a.revenue);
        setRevenueData(sorted);
        
        // Calculate totals
        const totals = sorted.reduce(
          (acc: any, item: RevenueData) => ({
            revenue: acc.revenue + item.revenue,
            orders: acc.orders + item.orders,
          }),
          { revenue: 0, orders: 0 }
        );
        
        setStats({
          totalRevenue: totals.revenue,
          totalOrders: totals.orders,
          averageOrderValue: totals.orders > 0 ? totals.revenue / totals.orders : 0,
        });
      } else {
        setError(revenueJson.error || 'Failed to load revenue attribution');
      }

      if (ordersJson.success) {
        setOrders(ordersJson.data);
      } else {
        setError((prev) => prev || ordersJson.error || 'Failed to load orders');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="headerTop">
          <div>
            <h1>Attribution Tracker</h1>
            <div className="subTitle">Track real revenue by platform → campaign → creative.</div>
          </div>
          <HealthBadge />
        </div>

        <div className="tabs">
          <button className={`tab ${tab === 'overview' ? 'tabActive' : ''}`} onClick={() => setTab('overview')}>
            Overview
          </button>
          <button className={`tab ${tab === 'orders' ? 'tabActive' : ''}`} onClick={() => setTab('orders')}>
            Orders
          </button>
          <button className={`tab ${tab === 'utm' ? 'tabActive' : ''}`} onClick={() => setTab('utm')}>
            UTM Builder
          </button>
          <button className={`tab ${tab === 'setup' ? 'tabActive' : ''}`} onClick={() => setTab('setup')}>
            Setup Code
          </button>
        </div>

        <div className="header-controls">
          {(tab === 'overview' || tab === 'orders') && (
            <>
              <div className="date-range">
                <label>
                  Start:
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  />
                </label>
                <label>
                  End:
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  />
                </label>
              </div>
              <div className="filters">
                <label>
                  Group By:
                  <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
                    <option value="source">Source</option>
                    <option value="medium">Medium</option>
                    <option value="campaign">Campaign</option>
                    <option value="creative">Creative</option>
                    <option value="source_medium">Source/Medium</option>
                  </select>
                </label>
                <label>
                  Attribution Model:
                  <select value={attributionModel} onChange={(e) => setAttributionModel(e.target.value)}>
                    <option value="last_touch">Last Touch</option>
                    <option value="first_touch">First Touch</option>
                    <option value="assisted">Assisted</option>
                  </select>
                </label>
              </div>
            </>
          )}
        </div>
      </header>

      {tab === 'setup' && <TrackerSetup />}
      {tab === 'utm' && <UtmBuilder />}

      {(tab === 'overview' || tab === 'orders') && (
        <>
          {loading ? (
            <div className="loading">Loading...</div>
          ) : error ? (
            <div className="errorBox">
              <div className="errorTitle">Could not load data</div>
              <div className="errorBody">{error}</div>
              <button className="retryBtn" onClick={fetchData} type="button">
                Retry
              </button>
            </div>
          ) : (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>Total Revenue</h3>
                  <p className="stat-value">
                    ${stats.totalRevenue.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className="stat-card">
                  <h3>Total Orders</h3>
                  <p className="stat-value">{stats.totalOrders.toLocaleString()}</p>
                </div>
                <div className="stat-card">
                  <h3>Average Order Value</h3>
                  <p className="stat-value">
                    ${stats.averageOrderValue.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>

              {tab === 'overview' && (
                <>
                  {revenueData.length === 0 ? (
                    <div className="emptyCard">
                      <h2>No attributed revenue yet</h2>
                      <p>
                        Install the tracker + send traffic with UTMs, then connect EasyOrders webhooks to ingest
                        orders.
                      </p>
                      <div className="emptyActions">
                        <button className="tab tabActive" onClick={() => setTab('setup')} type="button">
                          Go to Setup Code
                        </button>
                        <button className="tab" onClick={() => setTab('utm')} type="button">
                          Build UTM Link
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="charts-grid">
                      <div className="chart-card">
                        <h2>Revenue by {groupBy}</h2>
                        <RevenueChart data={revenueData} groupBy={groupBy} />
                      </div>
                      <div className="chart-card">
                        <h2>Attribution Breakdown</h2>
                        <AttributionBreakdown data={revenueData} groupBy={groupBy} />
                      </div>
                    </div>
                  )}
                </>
              )}

              {tab === 'orders' && (
                <div className="table-card">
                  <h2>Recent Orders</h2>
                  <OrdersTable orders={orders} />
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default Dashboard;
