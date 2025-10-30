import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DataPoint {
  month: string;
  hours: number;
}

interface Props {
  data: DataPoint[];
  title: string;
}

export default function TimeSeriesChart({ data, title }: Props) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check if dark mode is enabled
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };

    checkDarkMode();

    // Watch for dark mode changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  const textColor = isDark ? '#e5e7eb' : '#111827';
  const gridColor = isDark ? '#374151' : '#e5e7eb';
  const tooltipBg = isDark ? '#1f2937' : '#ffffff';
  const tooltipBorder = isDark ? '#374151' : '#e5e7eb';

  return (
    <div className="card p-6">
      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="month" stroke={textColor} />
          <YAxis stroke={textColor} />
          <Tooltip
            contentStyle={{
              backgroundColor: tooltipBg,
              border: `1px solid ${tooltipBorder}`,
              color: textColor
            }}
          />
          <Legend wrapperStyle={{ color: textColor }} />
          <Line
            type="monotone"
            dataKey="hours"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
