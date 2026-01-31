import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface RevenueData {
  [key: string]: string | number;
  revenue: number;
  orders: number;
  aov: number;
}

interface RevenueChartProps {
  data: RevenueData[];
  groupBy: string;
}

function RevenueChart({ data, groupBy }: RevenueChartProps) {
  const chartData = data.map((item) => ({
    name: String(item[groupBy] || 'direct'),
    revenue: Number(item.revenue),
    orders: Number(item.orders),
    aov: Number(item.aov),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
        <YAxis />
        <Tooltip
          formatter={(value: number, name: string) => {
            if (name === 'revenue') {
              return [`$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Revenue'];
            }
            if (name === 'aov') {
              return [`$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'AOV'];
            }
            return [value.toLocaleString(), name];
          }}
        />
        <Legend />
        <Bar dataKey="revenue" fill="#8884d8" name="Revenue" />
        <Bar dataKey="orders" fill="#82ca9d" name="Orders" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default RevenueChart;
