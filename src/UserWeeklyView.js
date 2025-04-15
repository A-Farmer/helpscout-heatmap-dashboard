import React from 'react';

const UserWeeklyView = ({ 
  heatmapData, 
  selectedEmail, 
  getColor 
}) => {
  // Format hour for display
  const formatHour = (hour) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h = hour % 12 || 12;
    return `${h} ${ampm}`;
  };

  // Find the maximum value for color scaling
  const findMaxValue = () => {
    if (!selectedEmail || selectedEmail === 'all') return 1;
    
    let max = 1;
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    days.forEach(day => {
      if (heatmapData[day]) {
        Object.values(heatmapData[day]).forEach(hourData => {
          const value = hourData.byEmail[selectedEmail] || 0;
          if (value > max) max = value;
        });
      }
    });
    
    return max;
  };

  const maxValue = findMaxValue();

  // If no email selected or all selected
  if (!selectedEmail || selectedEmail === 'all') {
    return (
      <div className="p-4 text-center">
        <p>Please select a specific team member to view their weekly response pattern.</p>
      </div>
    );
  }

  // Days of the week for display
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="mt-4 overflow-x-auto">
      <h2 className="text-lg font-medium mb-2">
        Weekly Response Pattern for {selectedEmail.split('@')[0]}
      </h2>
      
      <table className="min-w-full bg-white">
        <thead>
          <tr>
            <th className="p-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
              Day
            </th>
            {Array.from({ length: 24 }).map((_, hour) => (
              <th 
                key={hour} 
                className="p-3 border-b border-gray-200 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {formatHour(hour)}
              </th>
            ))}
            <th className="p-3 border-b border-gray-200 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {daysOfWeek.map((day, dayIndex) => {
            // Calculate total responses for this day
            let dayTotal = 0;
            if (heatmapData[day]) {
              Object.values(heatmapData[day]).forEach(hourData => {
                dayTotal += hourData.byEmail[selectedEmail] || 0;
              });
            }

            return (
              <tr key={dayIndex}>
                <td className="p-3 border-b border-gray-200 text-sm font-medium sticky left-0 bg-white z-10">
                  {day}
                </td>
                {Array.from({ length: 24 }).map((_, hour) => {
                  const value = heatmapData[day] && 
                    heatmapData[day][hour] ? 
                    heatmapData[day][hour].byEmail[selectedEmail] || 0 : 0;
                  
                  return (
                    <td key={hour} className="p-3 border-b border-gray-200 text-center">
                      <div 
                        className="p-2 rounded-md text-center"
                        style={{
                          backgroundColor: getColor(value, maxValue),
                          color: value > maxValue * 0.6 ? 'white' : 'black',
                          minWidth: '30px'
                        }}
                      >
                        {value || ''}
                      </div>
                    </td>
                  );
                })}
                <td className="p-3 border-b border-gray-200 text-center font-medium">
                  {dayTotal}
                </td>
              </tr>
            );
          })}
          <tr className="bg-gray-50">
            <td className="p-3 border-b border-gray-200 text-sm font-medium sticky left-0 bg-gray-50 z-10">
              Hourly Totals
            </td>
            {Array.from({ length: 24 }).map((_, hour) => {
              let hourTotal = 0;
              daysOfWeek.forEach(day => {
                if (heatmapData[day] && heatmapData[day][hour]) {
                  hourTotal += heatmapData[day][hour].byEmail[selectedEmail] || 0;
                }
              });
              
              return (
                <td key={hour} className="p-3 border-b border-gray-200 text-center font-medium">
                  {hourTotal}
                </td>
              );
            })}
            <td className="p-3 border-b border-gray-200 text-center font-medium">
              {/* Calculate grand total */}
              {(() => {
                let total = 0;
                daysOfWeek.forEach(day => {
                  if (heatmapData[day]) {
                    Object.values(heatmapData[day]).forEach(hourData => {
                      total += hourData.byEmail[selectedEmail] || 0;
                    });
                  }
                });
                return total;
              })()}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default UserWeeklyView;