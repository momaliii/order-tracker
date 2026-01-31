import { format } from 'date-fns';
import './OrdersTable.css';

interface Order {
  id: string;
  orderId: string;
  totalCost: number;
  status: string;
  createdAt: string;
  attributions?: Array<{
    touchpoint: {
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
      utmContent?: string;
    };
  }>;
}

interface OrdersTableProps {
  orders: Order[];
}

function OrdersTable({ orders }: OrdersTableProps) {
  const getAttributionSource = (order: Order) => {
    if (!order.attributions || order.attributions.length === 0) {
      return 'Direct/Unknown';
    }
    const tp = order.attributions[0].touchpoint;
    return tp.utmSource || tp.utmMedium || 'Direct';
  };

  const getStatusBadgeClass = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'paid' || statusLower === 'delivered') {
      return 'status-success';
    }
    if (statusLower === 'pending') {
      return 'status-pending';
    }
    if (statusLower === 'cancelled') {
      return 'status-cancelled';
    }
    return 'status-default';
  };

  return (
    <div className="orders-table-container">
      <table className="orders-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Date</th>
            <th>Source</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 ? (
            <tr>
              <td colSpan={5} className="no-orders">
                No orders found for the selected date range
              </td>
            </tr>
          ) : (
            orders.map((order) => (
              <tr key={order.id}>
                <td className="order-id">{order.orderId.substring(0, 8)}...</td>
                <td>{format(new Date(order.createdAt), 'MMM dd, yyyy HH:mm')}</td>
                <td>{getAttributionSource(order)}</td>
                <td className="amount">
                  ${order.totalCost.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td>
                  <span className={`status-badge ${getStatusBadgeClass(order.status)}`}>
                    {order.status}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default OrdersTable;
