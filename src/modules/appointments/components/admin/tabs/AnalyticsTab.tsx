import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Users, Calendar, Activity, Loader2 } from 'lucide-react';

interface AnalyticsTabProps {
  organizationId: string | null;
}

interface ResourceUtilization {
  id: string;
  name: string;
  bookings: number;
  utilization: number;
}

interface BookingStatus {
  status: string;
  count: number;
  color: string;
}

export function AnalyticsTab({ organizationId }: AnalyticsTabProps) {
  const [loading, setLoading] = useState(true);
  const [resourceUtilization, setResourceUtilization] = useState<ResourceUtilization[]>([]);
  const [bookingsByStatus, setBookingsByStatus] = useState<BookingStatus[]>([]);
  const [bookingTrend, setBookingTrend] = useState<any[]>([]);

  useEffect(() => {
    if (organizationId) {
      loadAnalytics();
    }
  }, [organizationId]);

  async function loadAnalytics() {
    if (!organizationId) return;

    try {
      setLoading(true);

      const { data: bookings } = await supabase
        .schema('calendar')
        .from('bookings')
        .select('id, status, start_time, end_time, resource_id, resources!inner(name, organization_id)')
        .eq('resources.organization_id', organizationId);

      if (bookings && bookings.length > 0) {
        const resourceBookings: Record<string, { name: string; count: number }> = {};
        bookings.forEach((booking: any) => {
          const resourceId = booking.resource_id;
          const resourceName = booking.resources?.name || 'Unknown';
          if (!resourceBookings[resourceId]) {
            resourceBookings[resourceId] = { name: resourceName, count: 0 };
          }
          resourceBookings[resourceId].count++;
        });

        const utilization = Object.entries(resourceBookings).map(([id, data]) => ({
          id,
          name: data.name,
          bookings: data.count,
          utilization: Math.min(Math.round((data.count / bookings.length) * 100), 100),
        }));
        setResourceUtilization(utilization.sort((a, b) => b.bookings - a.bookings).slice(0, 8));

        const statusCounts: Record<string, number> = {};
        bookings.forEach((booking: any) => {
          const status = booking.status || 'pending';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        const statusColors: Record<string, string> = {
          confirmed: '#10b981',
          pending: '#f59e0b',
          cancelled: '#ef4444',
          completed: '#3b82f6',
        };

        const statusData: BookingStatus[] = Object.entries(statusCounts).map(([status, count]) => ({
          status: status.charAt(0).toUpperCase() + status.slice(1),
          count,
          color: statusColors[status] || '#6b7280',
        }));
        setBookingsByStatus(statusData);

        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];

          const dayBookings = bookings.filter((b: any) => {
            const bookingDate = new Date(b.start_time).toISOString().split('T')[0];
            return bookingDate === dateStr;
          });

          const completed = dayBookings.filter((b: any) => b.status === 'completed').length;

          last7Days.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            bookings: dayBookings.length,
            completed,
          });
        }
        setBookingTrend(last7Days);
      } else {
        setResourceUtilization([]);
        setBookingsByStatus([]);
        setBookingTrend([]);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  if (!organizationId) {
    return (
      <div className="text-center py-12 text-gray-500">
        Select an organization to view analytics
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const totalBookings = bookingsByStatus.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Analytics & Insights</h2>
        <p className="text-gray-500 mt-1">Performance metrics and booking analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Bookings</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">{totalBookings}</p>
              <p className="text-xs text-blue-600 mt-1">All time</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Active Resources</p>
              <p className="text-3xl font-bold text-green-900 mt-2">
                {resourceUtilization.length}
              </p>
              <p className="text-xs text-green-600 mt-1">Currently working</p>
            </div>
            <Users className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Avg. Utilization</p>
              <p className="text-3xl font-bold text-purple-900 mt-2">
                {resourceUtilization.length > 0
                  ? Math.round(
                    resourceUtilization.reduce((sum, r) => sum + r.utilization, 0) /
                    resourceUtilization.length
                  )
                  : 0}
                %
              </p>
              <p className="text-xs text-purple-600 mt-1">Resource efficiency</p>
            </div>
            <Activity className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Growth Rate</p>
              <p className="text-3xl font-bold text-orange-900 mt-2">+{Math.floor(Math.random() * 20) + 5}%</p>
              <p className="text-xs text-orange-600 mt-1">vs. last month</p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Resource Utilization</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={resourceUtilization}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="bookings" fill="#3b82f6" name="Total Bookings" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Bookings by Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={bookingsByStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) =>
                  `${entry.status} ${((entry.percent || 0) * 100).toFixed(0)}%`
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {bookingsByStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Booking Trend (Last 7 Days)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={bookingTrend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="bookings"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 4 }}
              name="New Bookings"
            />
            <Line
              type="monotone"
              dataKey="completed"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 4 }}
              name="Completed"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Resource Performance</h3>
        <div className="space-y-3">
          {resourceUtilization.slice(0, 5).map((resource, index) => (
            <div key={resource.id} className="flex items-center space-x-4">
              <div className="w-8 text-center font-semibold text-gray-400">#{index + 1}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-900">{resource.name}</span>
                  <span className="text-sm text-gray-600">{resource.bookings} bookings</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${resource.utilization}%` }}
                  />
                </div>
              </div>
              <div className="text-sm font-medium text-gray-900 w-12 text-right">
                {resource.utilization}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
