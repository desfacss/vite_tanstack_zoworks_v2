import { CheckCircle, Calendar, Clock, Mail, ArrowLeft } from 'lucide-react';
import { formatDate, formatTime } from '../lib/utils/dateUtils';
import { BookingData } from '../lib/types';

interface BookingSuccessProps {
  bookingData: BookingData;
  onBackToDashboard: () => void;
}

export default function BookingSuccess({ bookingData, onBackToDashboard }: BookingSuccessProps) {
  const { eventType, selectedDate, selectedTime, inviteeName, inviteeEmail } = bookingData;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Meeting Scheduled!</h1>
          <p className="text-gray-600 mb-6">
            A confirmation email has been sent to <strong>{inviteeEmail}</strong>
          </p>

          <div className="bg-gray-50 rounded-lg p-6 space-y-4 text-left mb-6">
            <h2 className="font-semibold text-gray-900 text-lg">{eventType.title}</h2>

            <div className="flex items-start gap-3 text-gray-700">
              <Calendar className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">{formatDate(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
                <p className="text-sm text-gray-600">{selectedTime}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-gray-700">
              <Clock className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <p>{eventType.duration_minutes} minutes</p>
            </div>

            <div className="flex items-start gap-3 text-gray-700">
              <Mail className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">{inviteeName}</p>
                <p className="text-sm text-gray-600">{inviteeEmail}</p>
              </div>
            </div>
          </div>

          <button
            onClick={onBackToDashboard}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Your meeting has been confirmed and saved.
        </p>
      </div>
    </div>
  );
}
