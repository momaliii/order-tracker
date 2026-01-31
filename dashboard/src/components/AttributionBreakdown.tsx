import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface RevenueData {
  [key: string]: string | number;
  revenue: number;
  orders: number;
  aov: number;
}

interface AttributionBreakdownProps {
  data: RevenueData[];
  groupBy: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

function AttributionBreakdown({ data, groupBy }: AttributionBreakdownProps) {
  const chartData = data
    .map((item, index) => ({
      name: String(item[groupBy] || 'direct'),
      value: Number(item.revenue),
      color: COLORS[index % COLORS.length],
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10); // Top 10

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [
            `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            'Revenue',
          ]}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default AttributionBreakdown;
