import { ReactNode } from 'react';
import { motion } from 'motion/react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  description?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export function StatCard({ title, value, icon, description, trend }: StatCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between"
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500 tracking-tight">{title}</p>
          <h4 className="text-3xl font-semibold text-gray-900 mt-2 tracking-tight">{value}</h4>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl text-slate-600">
          {icon}
        </div>
      </div>
      {(description || trend) && (
        <div className="mt-4 flex items-center space-x-2 text-xs">
          {trend && (
            <span className={`font-medium ${trend.isPositive ? 'text-emerald-600' : 'text-amber-600'}`}>
              {trend.value}
            </span>
          )}
          {description && <span className="text-gray-500">{description}</span>}
        </div>
      )}
    </motion.div>
  );
}
export default StatCard;
